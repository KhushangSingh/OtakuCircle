import React from 'react';
import { RefreshCw, AlertTriangle, ArrowLeft } from './icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Silently report or log without crashing
        console.warn('Caught component render boundary error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0d0d0d] text-white font-sans flex items-center justify-center p-6 selection:bg-white/20">
                    <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-2xl text-center space-y-6 shadow-2xl shadow-black/50">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                            <AlertTriangle size={32} />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h2>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                A temporary render issue occurred. Your saved data and session remain completely safe.
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                            >
                                <RefreshCw size={15} />
                                <span>Reload Page</span>
                            </button>
                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white font-semibold text-xs sm:text-sm hover:bg-white/15 transition-all cursor-pointer border border-white/10"
                            >
                                <ArrowLeft size={15} />
                                <span>Home</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

