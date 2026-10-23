import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";

function normalizeBrazilPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  // If user typed 10 or 11 digits (DDD + number in Brazil without DDI 55), prepend 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { to, message, providerMode, altServerUrl, altApiKey, altInstance } = body;

    if (!to || !message) {
      return NextResponse.json({ error: "Número e mensagem são obrigatórios" }, { status: 400 });
    }

    const cleanTo = normalizeBrazilPhone(to);

    // If explicitly in simulation mode
    if (providerMode === "simulation") {
      return NextResponse.json({
        success: true,
        simulated: true,
        provider: "simulation",
        to: cleanTo,
        message: "Modo Simulação ativo. Nenhuma mensagem externa foi disparada."
      });
    }

    // Option A: Alternative Gateway (W-API, Evolution API, Z-API, Custom Gateway)
    if (providerMode === "alternative" || altServerUrl || altApiKey) {
      const targetUrl = (altServerUrl || process.env.WHATSAPP_ALT_API_URL || "https://api.w-api.app").trim();
      const rawKey = (altApiKey || process.env.WHATSAPP_ALT_API_KEY || "").trim();
      const cleanToken = rawKey.replace(/^Bearer\s+/i, "").trim();
      const instance = (altInstance || process.env.WHATSAPP_ALT_INSTANCE || "").trim();

      const isPlaceholderInstance = !instance || instance === "instancia_vendas_01" || instance === "default";

      if (!cleanToken || isPlaceholderInstance) {
        return NextResponse.json({
          success: false,
          simulated: true,
          provider: "alternative",
          to: cleanTo,
          error: "Credenciais da W-API não configuradas (Informe o Token Bearer e o ID da Instância reais).",
          message: "Envio apenas simulado: falta preencher o Token e o Instance ID da W-API."
        });
      }

      try {
        const cleanUrl = targetUrl.replace(/\/$/, "");
        const isWApi =
          cleanUrl.toLowerCase().includes("w-api") ||
          cleanUrl === "https://api.z-api.io"; // If user left default URL but filled W-API token & instance

        let sendEndpoint = cleanUrl;
        if (isWApi) {
          const baseWApiUrl = cleanUrl.includes("w-api") ? cleanUrl : "https://api.w-api.app";
          if (baseWApiUrl.includes("/send-text")) {
            sendEndpoint = baseWApiUrl.includes("instanceId=")
              ? baseWApiUrl
              : `${baseWApiUrl}?instanceId=${encodeURIComponent(instance)}`;
          } else {
            sendEndpoint = `${baseWApiUrl}/v1/message/send-text?instanceId=${encodeURIComponent(instance)}`;
          }
        } else if (!cleanUrl.includes("/message/") && !cleanUrl.includes("/send")) {
          sendEndpoint = `${cleanUrl}/message/sendText/${encodeURIComponent(instance)}`;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cleanToken}`
        };

        if (!isWApi) {
          headers["apikey"] = cleanToken;
          headers["Client-Token"] = cleanToken;
        }

        const payload = isWApi
          ? {
              phone: cleanTo,
              message: message,
              delayMessage: 1
            }
          : {
              phone: cleanTo,
              number: cleanTo,
              message: message,
              text: message
            };

        const res = await fetch(sendEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        const resData = await res.json().catch(() => ({}));

        if (res.ok && resData?.error !== true) {
          return NextResponse.json({
            success: true,
            simulated: false,
            provider: isWApi ? "w-api" : "alternative",
            to: cleanTo,
            data: resData
          });
        }

        const gatewayErrMsg =
          resData?.message ||
          resData?.error ||
          resData?.reason ||
          `Gateway respondeu com status HTTP ${res.status}`;

        return NextResponse.json({
          success: false,
          simulated: false,
          provider: isWApi ? "w-api" : "alternative",
          to: cleanTo,
          error: `Falha no envio via Gateway (${gatewayErrMsg})`,
          details: resData
        }, { status: 400 });
      } catch (altErr: any) {
        console.warn("Alternative WhatsApp Gateway error:", altErr.message);
        return NextResponse.json({
          success: false,
          simulated: true,
          provider: "alternative",
          to: cleanTo,
          error: `Não foi possível conectar ao servidor Gateway (${altErr.message}).`,
          message: "Servidor Gateway inacessível."
        }, { status: 502 });
      }
    }

    // Option B: Official Meta Cloud API
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        success: false,
        simulated: true,
        provider: providerMode || "meta",
        to: cleanTo,
        error: "Chaves da Meta API Oficial não configuradas.",
        message: "Envio simulado (Chaves da Meta API Oficial não configuradas no servidor)"
      });
    }

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        simulated: false,
        error: "Erro ao enviar mensagem via Meta Cloud API",
        details: data.error?.message || "Erro desconhecido"
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, simulated: false, provider: "meta", to: cleanTo, data });
  } catch (error: any) {
    console.error("WhatsApp Send Route Error:", error);
    return NextResponse.json({ error: "Erro interno ao processar envio" }, { status: 500 });
  }
}
