import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { to, message, providerMode, altServerUrl, altApiKey, altInstance } = body;

    if (!to || !message) {
      return NextResponse.json({ error: "Número e mensagem são obrigatórios" }, { status: 400 });
    }

    const cleanTo = String(to).replace(/\D/g, "");

    // Option A: Alternative / Non-Meta Gateway (Evolution API, Z-API, Baileys, Custom Gateway)
    if (providerMode === "alternative" || altServerUrl) {
      const targetUrl = altServerUrl || process.env.WHATSAPP_ALT_API_URL;
      const apiKey = altApiKey || process.env.WHATSAPP_ALT_API_KEY;
      const instance = altInstance || process.env.WHATSAPP_ALT_INSTANCE || "default";

      if (!targetUrl) {
        return NextResponse.json({
          success: true,
          simulated: true,
          provider: "alternative",
          message: "Envio simulado via Gateway Alternativo (URL do Gateway não configurada)"
        });
      }

      try {
        const cleanUrl = targetUrl.replace(/\/$/, "");
        const sendEndpoint = cleanUrl.includes("/message/")
          ? cleanUrl
          : `${cleanUrl}/message/sendText/${instance}`;

        const res = await fetch(sendEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey || "",
            "Client-Token": apiKey || "",
            "Authorization": `Bearer ${apiKey || ""}`
          },
          body: JSON.stringify({
            number: cleanTo,
            phone: cleanTo,
            text: message,
            message: message
          })
        });

        const resData = await res.json().catch(() => ({}));
        if (res.ok) {
          return NextResponse.json({
            success: true,
            provider: "alternative",
            data: resData
          });
        }
      } catch (altErr: any) {
        console.warn("Alternative WhatsApp Gateway offline/unreachable, falling back to simulated delivery:", altErr.message);
        return NextResponse.json({
          success: true,
          simulated: true,
          provider: "alternative",
          message: "Envio simulado via Gateway Alternativo (Servidor Gateway offline ou não responsivo)"
        });
      }
    }

    // Option B: Official Meta Cloud API
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        success: true,
        simulated: true,
        provider: providerMode || "meta",
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
      console.error("WhatsApp Meta API Error:", data);
      return NextResponse.json({
        error: "Erro ao enviar mensagem via Meta Cloud API",
        details: data.error?.message || "Erro desconhecido"
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, provider: "meta", data });
  } catch (error: any) {
    console.error("WhatsApp Send Route Error:", error);
    return NextResponse.json({ error: "Erro interno ao processar envio" }, { status: 500 });
  }
}
