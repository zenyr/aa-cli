// 커맨드 핸들러의 리턴 채널이 void 로 고정돼 있어, 종료 코드를 곁채널로 빼내기 위한 Ref.
import { Context, type Ref } from "effect"

export class ExitCode extends Context.Tag("@aa/adapter-cli/ExitCode")<
  ExitCode,
  Ref.Ref<number>
>() {}
