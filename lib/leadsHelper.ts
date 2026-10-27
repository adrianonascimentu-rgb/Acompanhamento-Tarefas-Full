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

export function normalizeText(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getLeadLookupKeys(lead: { id?: any; company?: string; name?: string; phone?: string }): string[] {
  const keys: string[] = [];
  if (lead.id !== undefined && lead.id !== null) {
    keys.push(`id:${String(lead.id)}`);
  }
  const comp = normalizeText(lead.company);
  const name = normalizeText(lead.name);
  const phone = (lead.phone || "").replace(/\D/g, "");
  if (comp && phone) keys.push(`cp:${comp}|${phone}`);
  if (comp && name) keys.push(`cn:${comp}|${name}`);
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
  addressMap: Record<string, LeadAddressMetadata>
): any {
  if (!lead) return lead;

  const { company, segment } = cleanCorruptedCompanyAndSegment(lead);

  const lookupKeys = getLeadLookupKeys(lead);
  let savedMeta: LeadAddressMetadata | null = null;
  for (const k of lookupKeys) {
    if (addressMap[k] && !isCorruptedOrIncompleteAddress(addressMap[k].address)) {
      savedMeta = addressMap[k];
      break;
    }
  }

  const currentAddressValid = !isCorruptedOrIncompleteAddress(lead.address);

  if (currentAddressValid) {
    const normAddr = normalizeText(lead.address);
    const matchedStreet = VERIFIED_STREETS_JP.find((s) => {
      const streetCore = normalizeText(s.street).replace(/^(av\.|avenida|rua|r\.)\s*/i, "");
      return streetCore.length >= 5 && normAddr.includes(streetCore);
    });

    const parsedParts = parseLeadAddressParts(lead);

    return {
      ...lead,
      company,
      segment,
      neighborhood: lead.neighborhood || parsedParts.neighborhood || matchedStreet?.neighborhood || "Manaíra",
      city: lead.city || parsedParts.city || matchedStreet?.city || "João Pessoa - PB",
      lat: typeof lead.lat === "number" && !isNaN(lead.lat) ? lead.lat : matchedStreet?.lat ?? -7.1145,
      lng: typeof lead.lng === "number" && !isNaN(lead.lng) ? lead.lng : matchedStreet?.lng ?? -34.829,
    };
  }

  if (savedMeta) {
    return {
      ...lead,
      company,
      segment,
      address: savedMeta.address,
      street: savedMeta.street,
      number: savedMeta.number,
      neighborhood: savedMeta.neighborhood || "Manaíra",
      city: savedMeta.city || "João Pessoa - PB",
      reference: savedMeta.reference || lead.reference || "",
      lat: savedMeta.lat ?? lead.lat ?? -7.1145,
      lng: savedMeta.lng ?? lead.lng ?? -34.829,
    };
  }

  const rawOldAddr = typeof lead.address === "string" ? lead.address : "";
  const normOld = normalizeText(rawOldAddr);
  const matchedVerified = VERIFIED_STREETS_JP.find((s) => {
    const streetCore = normalizeText(s.street).replace(/^(av\.|avenida|rua|r\.)\s*/i, "");
    return streetCore.length >= 5 && normOld.includes(streetCore);
  });

  const seed = hashLeadSeed(lead, index);
  const streetInfo = matchedVerified || VERIFIED_STREETS_JP[seed % VERIFIED_STREETS_JP.length];

  const existingNumMatch = rawOldAddr.match(/,\s*(\d+)/);
  const [minN, maxN] = streetInfo.numberRange;
  const streetNumber = existingNumMatch
    ? existingNumMatch[1]
    : String(minN + (seed % Math.max(maxN - minN, 100)));

  const repairedAddress = `${streetInfo.street}, ${streetNumber} - ${streetInfo.neighborhood}, ${streetInfo.city}`;

  return {
    ...lead,
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

  const terms = queryNorm.split(/\s+/).filter(Boolean);
  const combinedText = `${nameNorm} ${companyNorm} ${emailNorm} ${segmentNorm} ${addressNorm} ${neighborhoodNorm} ${cityNorm} ${referenceNorm} ${(lead.phone || "").toLowerCase()}`;

  const matchesAllTerms = terms.every((term) => combinedText.includes(term));
  if (matchesAllTerms) return true;

  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(searchQuery);
  const normalizedSearchDigits = searchQuery.replace(/\D/g, "");
  const normalizedPhoneDigits = lead.phone ? lead.phone.replace(/\D/g, "") : "";

  if (!hasLetters && normalizedSearchDigits.length >= 3 && normalizedPhoneDigits.includes(normalizedSearchDigits)) {
    return true;
  }

  return false;
}
