import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, XCircle, Loader } from 'lucide-react';

/**
 * VerifyLink — handles the one-click email verification link for linking
 * a password to a Google-only account.
 *
 * Route: /verify-link?token=<token>
 * The token comes from the email button. This page calls the backend
 * confirm-link endpoint, then logs the user in on success.
 */
const VerifyLink = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Invalid link — no token found. Please try signing in again.');
            return;
        }

        const confirm = async () => {
            try {
                const res = await axios.get(`${API_URL}/auth/confirm-link`, {
                    params: { token }
                });

                // Log the user in with the returned JWT
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('userId', res.data._id);
                localStorage.setItem('username', res.data.username);

                setStatus('success');
                setMessage(res.data.message);

                // Redirect to home after 2.5 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 2500);
            } catch (err) {
                setStatus('error');
                setMessage(
                    err.response?.data?.message ||
                    'This link has expired or already been used. Please try signing in again.'
                );
            }
        };

        confirm();
    }, []);

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-10 text-center shadow-2xl">

                {/* Loading */}
                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader className="animate-spin text-indigo-400 mx-auto" size={48} />
                        <p className="text-zinc-300 text-lg font-medium">Verifying your link…</p>
                        <p className="text-zinc-500 text-sm">This only takes a moment.</p>
                    </div>
                )}

                {/* Success */}
                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                            <ShieldCheck className="text-emerald-400" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Password Set!</h2>
                        <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
                        <p className="text-zinc-500 text-xs">Redirecting you to the app…</p>
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                            <XCircle className="text-red-400" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Link Invalid</h2>
                        <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all"
                        >
                            Back to Sign In
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyLink;
