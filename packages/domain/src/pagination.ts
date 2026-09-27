import { Schema } from "effect"

// 리스트 엔드포인트에 붙는 페이지네이션 정보.
export class Pagination extends Schema.Class<Pagination>("Pagination")({
  page: Schema.Number,
  page_size: Schema.Number,
  total_pages: Schema.Number,
  has_more: Schema.Boolean,
}) {}
