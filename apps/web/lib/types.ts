// Mirrors apps/api/src/agrilok_api/schemas.py by hand. Keep the two in step.

export type LevelCode = "level_4" | "level_7";
export type ReviewStateValue = "verified" | "ai_assisted_pending_review";

export interface Label {
  code: string;
  name_en: string;
  name_ne: string;
}

export interface LevelLabel extends Label {
  post_en: string;
  post_ne: string;
}

export interface Review {
  state: ReviewStateValue;
  reviewed_by: string | null;
  reviewed_at: string | null;
  self_review: boolean | null;
}

export interface LiveStatus {
  configured: boolean;
  available: boolean;
  reason: "ok" | "not_configured" | "quota" | "model_missing";
  used_today: number;
  limit_today: number;
  resets_at: string;
}

export interface LibraryStats {
  documents: number;
  syllabi_by_level: Record<LevelCode, number>;
  reference_documents: number;
  verified_documents: number;
  provinces: string[];
  last_fetched_on: string | null;
}

export interface Meta {
  levels: LevelLabel[];
  provinces: Label[];
  service_groups: Label[];
  library: LibraryStats;
  live: LiveStatus;
}

export interface DocumentSummary {
  id: string;
  title: string;
  authority: string;
  doc_class: "syllabus" | "reference";
  doc_type: string;
  exam_level: LevelCode | null;
  province: string;
  service_groups: string[];
  fetched_on: string;
  resolvable_url: string;
  source_url: string;
  archived: boolean;
  review: Review;
  chunk_count: number;
  extraction_confidence: number;
  superseded: boolean;
}

export interface OutlineEntry {
  label: string;
  text: string;
}

export interface DocumentDetail extends DocumentSummary {
  referring_page: string | null;
  checksum: string;
  bytes: number;
  acquisition: "crawled" | "manual";
  source_name: string;
  extraction_method: "text_layer" | "ocr";
  gibberish_lines_dropped: number;
  admitted_at: string | null;
  as_of: string | null;
  outline: OutlineEntry[];
}

export interface LevelLibrary {
  level: LevelCode;
  syllabi: DocumentSummary[];
  reference: DocumentSummary[];
}

export interface SearchHit {
  chunk_id: string;
  document_id: string;
  document_title: string;
  doc_class: string;
  exam_level: LevelCode | null;
  province: string;
  section_heading: string | null;
  snippet: string;
  resolvable_url: string;
  fetched_on: string;
  review_state: ReviewStateValue;
}

export interface SearchResults {
  level: LevelCode;
  query: string;
  terms: string[];
  hits: SearchHit[];
}

export interface Citation {
  n: number;
  chunk_id: string;
  document_id: string;
  document_title: string;
  authority: string | null;
  doc_class: string | null;
  doc_type: string | null;
  exam_level: LevelCode | null;
  province: string | null;
  section_heading: string | null;
  quotes: string[];
  resolvable_url: string;
  source_url: string | null;
  fetched_on: string | null;
  review_state: ReviewStateValue;
}

export interface Consulted {
  document_id: string;
  title: string | null;
  province: string | null;
  doc_class: string | null;
  resolvable_url: string | null;
  similarity: number | null;
  used: boolean;
}

export type ReasonCode =
  | "no_sources"
  | "model_insufficient"
  | "support_check"
  | "blocked"
  | "personal_data"
  | "quota"
  | "unavailable"
  | "model_error";

export interface AskResponse {
  id: string | null;
  status: "answered" | "refused" | "unavailable";
  reason: { code: ReasonCode; detail: string | null } | null;
  question: string;
  level: LevelCode;
  province: string | null;
  service_group: string | null;
  answer_text: string | null;
  citations: Citation[];
  consulted: Consulted[];
  review: Review;
  cache: {
    hit: boolean;
    kind: "exact" | "similar" | null;
    matched_question: string | null;
    similarity: number | null;
    served_count: number;
  };
  model: string | null;
  created_at: string;
  retry_after: string | null;
}

export interface CommonQuestion {
  id: string;
  question: string;
  province: string | null;
  served_count: number;
  review: Review;
}
