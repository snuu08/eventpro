import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { message: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || "알 수 없는 오류가 발생했습니다." };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("app-error", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.message) {
      return this.props.children;
    }
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold">화면을 표시하지 못했습니다</h1>
        <p className="mt-2 text-sm text-gray-600">{this.state.message}</p>
        <p className="mt-2 text-sm text-gray-600">입력한 내용은 이 기기 저장소에 남아 있을 수 있습니다. 페이지를 다시 열어 보세요.</p>
        <button
          type="button"
          className="mt-4 rounded bg-gray-900 px-3 py-2 text-sm text-white"
          onClick={() => this.setState({ message: null })}
        >
          다시 시도
        </button>
      </main>
    );
  }
}
