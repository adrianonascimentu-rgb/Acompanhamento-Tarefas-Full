import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authorized) return auth.response;

  const metaConfig = {
    hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
    hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    hasBusinessAccountId: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    hasVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
  };

  const altConfig = {
    hasServerUrl: !!process.env.WHATSAPP_ALT_API_URL,
    hasApiKey: !!process.env.WHATSAPP_ALT_API_KEY,
    hasInstance: !!process.env.WHATSAPP_ALT_INSTANCE,
    serverUrl: process.env.WHATSAPP_ALT_API_URL || null,
    instance: process.env.WHATSAPP_ALT_INSTANCE || null,
  };

  const isMetaConfigured = metaConfig.hasAccessToken && metaConfig.hasPhoneNumberId;
  const isAltConfigured = altConfig.hasServerUrl;

  return NextResponse.json({
    status: isMetaConfigured || isAltConfigured ? "configured" : "simulation",
    metaConfigured: isMetaConfigured,
    altConfigured: isAltConfigured,
    config: metaConfig,
    altConfig: altConfig,
    availableProviders: [
      {
        id: "meta",
        name: "Meta Cloud API (Oficial)",
        type: "official",
        status: isMetaConfigured ? "configured" : "pending",
        description: "API oficial da Meta com tokens e Phone Number ID."
      },
      {
        id: "alternative",
        name: "Gateway Alternativo / QR Code (Evolution API / Z-API / Baileys)",
        type: "un official",
        status: isAltConfigured ? "configured" : "ready",
        description: "Conexão direta por QR Code ou servidor Gateway alternativo sem burocracia Meta."
      },
      {
        id: "simulation",
        name: "Modo Simulação / Sandbox Interno",
        type: "local",
        status: "active",
        description: "Simulador automático de mensagens e respostas para testes e treinamento."
      }
    ]
  });
}
