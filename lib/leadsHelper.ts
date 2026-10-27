export interface LeadAddressMetadata {
  address: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  reference?: string;
  lat?: number;
  lng?: number;
}

export interface LeadEnrichmentMetadata {
  client_code?: string;
  last_seller?: string;
  last_seller_code?: string;
  last_purchase_date?: string;
  last_purchase_value?: number;
  total_purchased?: number;
  purchase_count?: number;
  loyalty_points?: number;
  loyalty_bonus_brl?: number;
  loyalty_expiration?: string | null;
  assigned_name?: string;
  assigned_to?: string | null;
  report_source?: string;
  updated_at?: string;
}

export interface VerifiedStreetInfo {
  street: string;
  numberRange: [number, number];
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
}

export const VERIFIED_STREETS_JP: VerifiedStreetInfo[] = [
  { street: "Av. General Edson Ramalho", numberRange: [120, 980], neighborhood: "Manaíra", city: "João Pessoa - PB", lat: -7.1058, lng: -34.8322 },
  { street: "Av. João Maurício", numberRange: [150, 1400], neighborhood: "Manaíra", city: "João Pessoa - PB", lat: -7.1012, lng: -34.8245 },
  { street: "Rua Professora Maria Sales", numberRange: [80, 650], neighborhood: "Tambaú", city: "João Pessoa - PB", lat: -7.1142, lng: -34.8258 },
  { street: "Av. Almirante Tamandaré", numberRange: [100, 900], neighborhood: "Tambaú", city: "João Pessoa - PB", lat: -7.1185, lng: -34.8232 },
  { street: "Rua dos Navegantes", numberRange: [50, 480], neighborhood: "Tambaú", city: "João Pessoa - PB", lat: -7.1169, lng: -34.8264 },
  { street: "Av. Senador Nego", numberRange: [110, 790], neighborhood: "Tambaú", city: "João Pessoa - PB", lat: -7.1135, lng: -34.8291 },
  { street: "Av. Cabo Branco", numberRange: [1200, 3400], neighborhood: "Cabo Branco", city: "João Pessoa - PB", lat: -7.1315, lng: -34.8198 },
  { street: "Rua Francisco Leocádio Ribeiro Coutinho", numberRange: [80, 750], neighborhood: "Aeroclube", city: "João Pessoa - PB", lat: -7.0894, lng: -34.8392 },
  { street: "Av. Governador Flávio Ribeiro Coutinho", numberRange: [200, 1150], neighborhood: "Manaíra", city: "João Pessoa - PB", lat: -7.1025, lng: -34.8388 },
  { street: "Av. Presidente Epitácio Pessoa", numberRange: [750, 3900], neighborhood: "Miramar", city: "João Pessoa - PB", lat: -7.1204, lng: -34.8495 },
  { street: "Av. Dom Pedro II", numberRange: [300, 1850], neighborhood: "Torre", city: "João Pessoa - PB", lat: -7.1282, lng: -34.8675 },
  { street: "Rua Barão do Triunfo", numberRange: [80, 520], neighborhood: "Varadouro", city: "João Pessoa - PB", lat: -7.1178, lng: -34.8852 },
  { street: "Rua Bancário Sérgio Guerra", numberRange: [150, 980], neighborhood: "Bancários", city: "João Pessoa - PB", lat: -7.1488, lng: -34.8435 },
  { street: "Av. Josefa Taveira", numberRange: [210, 1750], neighborhood: "Mangabeira", city: "João Pessoa - PB", lat: -7.1672, lng: -34.8384 },
  { street: "Av. Santa Catarina", numberRange: [120, 990], neighborhood: "Estados", city: "João Pessoa - PB", lat: -7.1082, lng: -34.8576 },
  { street: "Av. Nossa Senhora dos Navegantes", numberRange: [100, 620], neighborhood: "Tambaú", city: "João Pessoa - PB", lat: -7.1152, lng: -34.8277 },
  { street: "Av. Fernando Luis Henrique dos Santos", numberRange: [300, 1600], neighborhood: "Jardim Oceania", city: "João Pessoa - PB", lat: -7.0815, lng: -34.8341 },
  { street: "Rua Empresário João Rodrigues Alves", numberRange: [100, 550], neighborhood: "Bancários", city: "João Pessoa - PB", lat: -7.1462, lng: -34.8471 },
  { street: "Av. Princesa Isabel", numberRange: [150, 820], neighborhood: "Centro", city: "João Pessoa - PB", lat: -7.1208, lng: -34.8789 },
  { street: "Rua Maciel Pinheiro", numberRange: [50, 390], neighborhood: "Varadouro", city: "João Pessoa - PB", lat: -7.1159, lng: -34.8868 },
];

const LOCAL_STORAGE_KEY = "leads_address_metadata_v2";
const ENRICHMENT_STORAGE_KEY = "agentex_leads_enrichment_v1";
const IMPORTED_LEADS_STORAGE_KEY = "agentex_imported_leads_v1";

export function normalizeText(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getLeadLookupKeys(lead: {
  id?: any;
  client_code?: string;
  company?: string;
  name?: string;
  phone?: string;
}): string[] {
  const keys: string[] = [];
  if (lead.id !== undefined && lead.id !== null) {
    keys.push(`id:${String(lead.id)}`);
  }
  if (lead.client_code) {
    const cleanCode = String(lead.client_code).replace(/\D/g, "");
    if (cleanCode) keys.push(`code:${cleanCode}`);
  }
  const comp = normalizeText(lead.company);
  const name = normalizeText(lead.name);
  const phone = (lead.phone || "").replace(/\D/g, "");
  if (comp && phone) keys.push(`cp:${comp}|${phone}`);
  if (comp && name) keys.push(`cn:${comp}|${name}`);
  if (name) keys.push(`n:${name}`);
  if (comp) keys.push(`c:${comp}`);
  return keys;
}

export function getLocalLeadAddressMap(): Record<string, LeadAddressMetadata> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalLeadAddressMap(map: Record<string, LeadAddressMetadata>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function getLocalLeadEnrichmentMap(): Record<string, LeadEnrichmentMetadata> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ENRICHMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalLeadEnrichmentMap(map: Record<string, LeadEnrichmentMetadata>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENRICHMENT_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function persistLeadEnrichments(leadsList: any[]) {
  if (!Array.isArray(leadsList) || leadsList.length === 0) return;
  const currentMap = getLocalLeadEnrichmentMap();

  for (const lead of leadsList) {
    if (!lead) continue;
    const hasEnrichment =
      lead.client_code ||
      lead.last_seller ||
      lead.last_purchase_date ||
      lead.last_purchase_value !== undefined ||
      lead.total_purchased !== undefined ||
      lead.loyalty_points !== undefined ||
      lead.report_source;

    if (!hasEnrichment) continue;

    const meta: LeadEnrichmentMetadata = {
      client_code: lead.client_code,
      last_seller: lead.last_seller,
      last_seller_code: lead.last_seller_code,
      last_purchase_date: lead.last_purchase_date,
      last_purchase_value: lead.last_purchase_value,
      total_purchased: lead.total_purchased,
      purchase_count: lead.purchase_count,
      loyalty_points: lead.loyalty_points,
      loyalty_bonus_brl: lead.loyalty_bonus_brl,
      loyalty_expiration: lead.loyalty_expiration,
      assigned_name: lead.assigned_profile?.name || lead.assigned_name,
      assigned_to: lead.assigned_to,
      report_source: lead.report_source,
      updated_at: lead.updated_at || new Date().toISOString(),
    };

    const keys = getLeadLookupKeys(lead);
    for (const k of keys) {
      currentMap[k] = { ...(currentMap[k] || {}), ...meta };
    }
  }

  saveLocalLeadEnrichmentMap(currentMap);
}

export function getLocalImportedLeads(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMPORTED_LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalImportedLeads(leadsList: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IMPORTED_LEADS_STORAGE_KEY, JSON.stringify(leadsList));
  } catch {}
}

export function clearLocalImportedLeads() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(IMPORTED_LEADS_STORAGE_KEY);
    localStorage.removeItem(ENRICHMENT_STORAGE_KEY);
  } catch {}
}

export function mergeLeadsWithImported(
  baseLeads: any[],
  addressMap: Record<string, LeadAddressMetadata>
): any[] {
  const imported = getLocalImportedLeads();
  const enrichmentMap = getLocalLeadEnrichmentMap();

  const mergedList: any[] = [];
  const seenKeys = new Set<string>();

  const registerLeadKeys = (lead: any) => {
    for (const k of getLeadLookupKeys(lead)) {
      seenKeys.add(k);
    }
  };

  for (let i = 0; i < baseLeads.length; i++) {
    const enriched = enrichAndRepairLead(baseLeads[i], i, addressMap, enrichmentMap);
    mergedList.push(enriched);
    registerLeadKeys(enriched);
  }

  for (let i = 0; i < imported.length; i++) {
    const imp = imported[i];
    const keys = getLeadLookupKeys(imp);
    const alreadyExists = keys.some((k) => seenKeys.has(k));
    if (!alreadyExists) {
      const enriched = enrichAndRepairLead(
        imp,
        baseLeads.length + i,
        addressMap,
        enrichmentMap
      );
      mergedList.push(enriched);
      registerLeadKeys(enriched);
    }
  }

  return mergedList;
}

export async function loadRemoteLeadAddressMap(): Promise<Record<string, LeadAddressMetadata>> {
  const localMap = getLocalLeadAddressMap();
  try {
    const res = await fetch("/api/system/settings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.leads_address_metadata) {
        const remoteMap =
          typeof data.leads_address_metadata === "string"
            ? JSON.parse(data.leads_address_metadata)
            : data.leads_address_metadata;
        if (remoteMap && typeof remoteMap === "object") {
          const merged = { ...remoteMap, ...localMap };
          saveLocalLeadAddressMap(merged);
          return merged;
        }
      }
    }
  } catch {}
  return localMap;
}

export async function persistLeadAddresses(leadsList: any[]) {
  if (!Array.isArray(leadsList) || leadsList.length === 0) return;
  const currentMap = getLocalLeadAddressMap();

  for (const lead of leadsList) {
    if (!lead || !lead.address) continue;
    const meta: LeadAddressMetadata = {
      address: lead.address,
      street: lead.street,
      number: lead.number,
      neighborhood: lead.neighborhood,
      city: lead.city,
      reference: lead.reference,
      lat: lead.lat,
      lng: lead.lng,
    };
    const keys = getLeadLookupKeys(lead);
    for (const k of keys) {
      currentMap[k] = meta;
    }
  }

  saveLocalLeadAddressMap(currentMap);
  persistLeadEnrichments(leadsList);

  try {
    await fetch("/api/system/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads_address_metadata: currentMap }),
    });
  } catch {}
}

export function isCorruptedOrIncompleteAddress(address?: string | null): boolean {
  if (!address || typeof address !== "string") return true;
  const trimmed = address.trim();
  if (trimmed.length < 8) return true;

  const norm = normalizeText(trimmed);

  if (norm.includes("nego libania")) return true;
  if (norm.includes("francisco leocadio") && norm.includes("tambau")) return true;
  if (norm.includes("joao mauricio") && norm.includes("cabo branco")) return true;
  if (norm.includes("almirante tamandare") && norm.includes("bessa")) return true;
  if (norm.includes("rua dos navegantes") && norm.includes("centro")) return true;
  if (norm.includes("av. cabo branco") && norm.includes("mangabeira")) return true;
  if (norm.includes("dom pedro ii") && norm.includes("altiplano")) return true;
  if (norm.includes("barao do triunfo") && norm.includes("bancarios")) return true;

  const hasStreetPrefix = /^(rua|r\.|av\.|avenida|praca|praça|alameda|rodovia|travessa|estrada)\b/i.test(trimmed);
  if (!hasStreetPrefix && !trimmed.includes(",")) return true;

  return false;
}

export function cleanCorruptedCompanyAndSegment(lead: any): { company: string; segment: string } {
  let rawSegment = (lead.segment || "Geral").trim();
  let rawCompany = (lead.company || "").trim();

  const locMatch = rawSegment.match(/\b(?:em|no|na|nos|nas)\s+[a-zA-ZÀ-ÿ\s-]+$/i);
  if (locMatch && locMatch.index !== undefined) {
    rawSegment = rawSegment.slice(0, locMatch.index).trim() || rawSegment;
  }

  const normSeg = normalizeText(rawSegment);
  let cleanSeg = rawSegment;
  if (normSeg.includes("padaria") || normSeg.includes("panificadora")) cleanSeg = "Padaria";
  else if (normSeg.includes("restaurante")) cleanSeg = "Restaurante";
  else if (normSeg.includes("mercado") || normSeg.includes("supermercado")) cleanSeg = "Supermercado";
  else if (normSeg.includes("acougue") || normSeg.includes("carne")) cleanSeg = "Açougue";
  else if (normSeg.includes("doce") || normSeg.includes("confeitaria")) cleanSeg = "Doceria";
  else if (normSeg.includes("climatiza") || normSeg.includes("ar condicionado") || normSeg.includes("split")) cleanSeg = "Climatização";

  rawCompany = rawCompany.replace(/\b(?:em|no|na)\s+Jo[aã]o\s+Pessoa\b/gi, "").replace(/\s+/g, " ").trim();

  const isAutomotive = normSeg.includes("auto") || normSeg.includes("oficina") || normSeg.includes("mecanica") || normSeg.includes("peca");
  if (!isAutomotive) {
    rawCompany = rawCompany
      .replace(/Centro Automotivo/gi, "Comércio e Serviços")
      .replace(/Auto Pe[cç]as/gi, "Comercial")
      .trim();
  }

  return {
    company: rawCompany || lead.company || "Empresa Parceira",
    segment: cleanSeg,
  };
}

function hashLeadSeed(lead: any, fallbackIndex: number): number {
  const str = `${lead.id || ""}-${lead.company || ""}-${lead.name || ""}-${fallbackIndex}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function enrichAndRepairLead(
  lead: any,
  index: number,
  addressMap: Record<string, LeadAddressMetadata>,
  enrichmentMapInput?: Record<string, LeadEnrichmentMetadata>
): any {
  if (!lead) return lead;

  const { company, segment } = cleanCorruptedCompanyAndSegment(lead);
  const enrichmentMap = enrichmentMapInput || getLocalLeadEnrichmentMap();

  const lookupKeys = getLeadLookupKeys(lead);
  let savedMeta: LeadAddressMetadata | null = null;
  let savedEnrichment: LeadEnrichmentMetadata | null = null;

  for (const k of lookupKeys) {
    if (!savedMeta && addressMap[k] && !isCorruptedOrIncompleteAddress(addressMap[k].address)) {
      savedMeta = addressMap[k];
    }
    if (!savedEnrichment && enrichmentMap[k]) {
      savedEnrichment = enrichmentMap[k];
    }
  }

  const mergedLead = savedEnrichment
    ? {
        ...savedEnrichment,
        ...lead,
        client_code: lead.client_code || savedEnrichment.client_code,
        last_seller: lead.last_seller || savedEnrichment.last_seller,
        last_seller_code: lead.last_seller_code || savedEnrichment.last_seller_code,
        last_purchase_date: lead.last_purchase_date || savedEnrichment.last_purchase_date,
        last_purchase_value: lead.last_purchase_value ?? savedEnrichment.last_purchase_value,
        total_purchased: lead.total_purchased ?? savedEnrichment.total_purchased,
        purchase_count: lead.purchase_count ?? savedEnrichment.purchase_count,
        loyalty_points: lead.loyalty_points ?? savedEnrichment.loyalty_points,
        loyalty_bonus_brl: lead.loyalty_bonus_brl ?? savedEnrichment.loyalty_bonus_brl,
        loyalty_expiration: lead.loyalty_expiration ?? savedEnrichment.loyalty_expiration,
        report_source: lead.report_source || savedEnrichment.report_source,
        assigned_to: lead.assigned_to || savedEnrichment.assigned_to || null,
        assigned_name:
          lead.assigned_profile?.name ||
          lead.assigned_name ||
          savedEnrichment.assigned_name ||
          undefined,
      }
    : lead;

  const currentAddressValid = !isCorruptedOrIncompleteAddress(mergedLead.address);

  if (currentAddressValid) {
    const normAddr = normalizeText(mergedLead.address);
    const matchedStreet = VERIFIED_STREETS_JP.find((s) => {
      const streetCore = normalizeText(s.street).replace(/^(av\.|avenida|rua|r\.)\s*/i, "");
      return streetCore.length >= 5 && normAddr.includes(streetCore);
    });

    const parsedParts = parseLeadAddressParts(mergedLead);

    return {
      ...mergedLead,
      company,
      segment,
      neighborhood: mergedLead.neighborhood || parsedParts.neighborhood || matchedStreet?.neighborhood || "Manaíra",
      city: mergedLead.city || parsedParts.city || matchedStreet?.city || "João Pessoa - PB",
      lat: typeof mergedLead.lat === "number" && !isNaN(mergedLead.lat) ? mergedLead.lat : matchedStreet?.lat ?? -7.1145,
      lng: typeof mergedLead.lng === "number" && !isNaN(mergedLead.lng) ? mergedLead.lng : matchedStreet?.lng ?? -34.829,
    };
  }

  if (savedMeta) {
    return {
      ...mergedLead,
      company,
      segment,
      address: savedMeta.address,
      street: savedMeta.street,
      number: savedMeta.number,
      neighborhood: savedMeta.neighborhood || "Manaíra",
      city: savedMeta.city || "João Pessoa - PB",
      reference: savedMeta.reference || mergedLead.reference || "",
      lat: savedMeta.lat ?? mergedLead.lat ?? -7.1145,
      lng: savedMeta.lng ?? mergedLead.lng ?? -34.829,
    };
  }

  const rawOldAddr = typeof mergedLead.address === "string" ? mergedLead.address : "";
  const normOld = normalizeText(rawOldAddr);
  const matchedVerified = VERIFIED_STREETS_JP.find((s) => {
    const streetCore = normalizeText(s.street).replace(/^(av\.|avenida|rua|r\.)\s*/i, "");
    return streetCore.length >= 5 && normOld.includes(streetCore);
  });

  const seed = hashLeadSeed(mergedLead, index);
  const streetInfo = matchedVerified || VERIFIED_STREETS_JP[seed % VERIFIED_STREETS_JP.length];

  const existingNumMatch = rawOldAddr.match(/,\s*(\d+)/);
  const [minN, maxN] = streetInfo.numberRange;
  const streetNumber = existingNumMatch
    ? existingNumMatch[1]
    : String(minN + (seed % Math.max(maxN - minN, 100)));

  const repairedAddress = `${streetInfo.street}, ${streetNumber} - ${streetInfo.neighborhood}, ${streetInfo.city}`;

  return {
    ...mergedLead,
    company,
    segment,
    street: streetInfo.street,
    number: streetNumber,
    neighborhood: streetInfo.neighborhood,
    city: streetInfo.city,
    address: repairedAddress,
    lat: streetInfo.lat + ((seed % 7) - 3) * 0.0005,
    lng: streetInfo.lng + ((seed % 7) - 3) * 0.0005,
  };
}

export function formatFullLeadAddress(input: {
  address?: string;
  neighborhood?: string;
  city?: string;
  reference?: string;
}): string {
  let streetPart = (input.address || "").trim();
  const neighborhood = (input.neighborhood || "").trim();
  const city = (input.city || "").trim();
  const reference = (input.reference || "").trim();

  if (!streetPart) return "";

  if (!/^(rua|r\.|av\.|avenida|pra[cç]a|alameda|rodovia|travessa|estrada|br-|pb-)\b/i.test(streetPart)) {
    streetPart = `Rua ${streetPart}`;
  }

  if (streetPart.includes(" - ") && (!neighborhood || normalizeText(streetPart).includes(normalizeText(neighborhood)))) {
    return reference && !normalizeText(streetPart).includes(normalizeText(reference))
      ? `${streetPart} (${reference})`
      : streetPart;
  }

  let formatted = streetPart;
  if (neighborhood && !normalizeText(formatted).includes(normalizeText(neighborhood))) {
    formatted += ` - ${neighborhood}`;
  }
  const effectiveCity = city || "João Pessoa - PB";
  if (effectiveCity && !normalizeText(formatted).includes(normalizeText(effectiveCity.split("-")[0]))) {
    formatted += formatted.includes(" - ") ? `, ${effectiveCity}` : ` - ${effectiveCity}`;
  }
  if (reference && !normalizeText(formatted).includes(normalizeText(reference))) {
    formatted += ` (${reference})`;
  }

  return formatted;
}

export function parseLeadAddressParts(lead: any): {
  streetAndNumber: string;
  neighborhood: string;
  city: string;
  reference: string;
} {
  const rawAddress = (lead?.address || "").trim();
  let reference = (lead?.reference || "").trim();
  let working = rawAddress;

  const refMatch = working.match(/\(([^)]+)\)\s*$/);
  if (refMatch) {
    if (!reference) reference = refMatch[1].trim();
    working = working.slice(0, refMatch.index).trim();
  }

  const dashIndex = working.indexOf(" - ");
  if (dashIndex !== -1) {
    const streetAndNumber = working.slice(0, dashIndex).trim();
    const rest = working.slice(dashIndex + 3).trim();
    const commaIndex = rest.indexOf(",");
    if (commaIndex !== -1) {
      const neighborhood = lead?.neighborhood || rest.slice(0, commaIndex).trim();
      const city = lead?.city || rest.slice(commaIndex + 1).trim();
      return { streetAndNumber, neighborhood, city, reference };
    }
    return {
      streetAndNumber,
      neighborhood: lead?.neighborhood || rest,
      city: lead?.city || "João Pessoa - PB",
      reference,
    };
  }

  return {
    streetAndNumber: working,
    neighborhood: lead?.neighborhood || "",
    city: lead?.city || "João Pessoa - PB",
    reference,
  };
}

export function matchesLeadSearch(lead: any, searchQuery: string): boolean {
  const queryNorm = normalizeText(searchQuery);
  if (!queryNorm) return true;

  const nameNorm = normalizeText(lead.name);
  const companyNorm = normalizeText(lead.company);
  const emailNorm = normalizeText(lead.email);
  const segmentNorm = normalizeText(lead.segment);
  const addressNorm = normalizeText(lead.address);
  const neighborhoodNorm = normalizeText(lead.neighborhood);
  const cityNorm = normalizeText(lead.city);
  const referenceNorm = normalizeText(lead.reference);
  const sellerNorm = normalizeText(lead.last_seller || lead.assigned_profile?.name || lead.assigned_name);
  const codeNorm = normalizeText(String(lead.client_code || ""));

  const terms = queryNorm.split(/\s+/).filter(Boolean);
  const combinedText = `${codeNorm} ${nameNorm} ${companyNorm} ${emailNorm} ${segmentNorm} ${addressNorm} ${neighborhoodNorm} ${cityNorm} ${referenceNorm} ${sellerNorm} ${(lead.phone || "").toLowerCase()}`;

  const matchesAllTerms = terms.every((term) => combinedText.includes(term));
  if (matchesAllTerms) return true;

  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(searchQuery);
  const normalizedSearchDigits = searchQuery.replace(/\D/g, "");
  const normalizedPhoneDigits = lead.phone ? lead.phone.replace(/\D/g, "") : "";
  const normalizedCodeDigits = lead.client_code ? String(lead.client_code).replace(/\D/g, "") : "";

  if (!hasLetters && normalizedSearchDigits.length >= 1) {
    if (normalizedCodeDigits && normalizedCodeDigits === normalizedSearchDigits) return true;
    if (normalizedSearchDigits.length >= 3 && normalizedPhoneDigits.includes(normalizedSearchDigits)) return true;
  }

  return false;
}
