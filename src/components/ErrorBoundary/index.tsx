import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  sceneName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 场景错误边界组件
 * 防止单个场景崩溃导致整个应用白屏
 */
export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('场景渲染错误:', error);
    console.error('错误详情:', errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-gray-800 rounded-2xl shadow-2xl border border-red-500/30 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">场景加载失败</h2>
                <p className="text-gray-400">
                  {this.props.sceneName || '当前场景'}渲染出错
                </p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-red-500/20">
              <p className="text-red-400 text-sm font-mono mb-2">
                {this.state.error?.message || '未知错误'}
              </p>
              {this.state.errorInfo && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-400">
                    查看详细错误信息
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-950 rounded overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleRefresh}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
              <button
                onClick={this.handleGoBack}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
              >
                返回上一页
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              如果问题持续存在，请检查控制台日志或联系技术支持
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 全局错误边界组件
 * 用于包裹整个应用
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('应用渲染错误:', error);
    console.error('错误详情:', errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-gray-800 rounded-2xl shadow-2xl border border-red-500/30 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">应用出错</h2>
                <p className="text-gray-400">发生严重错误，应用无法继续运行</p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-red-500/20">
              <p className="text-red-400 text-sm font-mono">
                {this.state.error?.message || '未知错误'}
              </p>
            </div>

            <button
              onClick={this.handleRefresh}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新加载应用
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SceneErrorBoundary;
