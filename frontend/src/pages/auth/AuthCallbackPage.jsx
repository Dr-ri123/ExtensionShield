import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { validateReturnTo } from "../../utils/authUtils";
import SEOHead from "../../components/SEOHead";
import ShieldLogo from "../../components/ShieldLogo";
import "./AuthCallbackPage.scss";

// Module-level guard: only one code exchange per page load (survives StrictMode remount)
let _callbackExchangeStarted = false;

/**
 * Auth Callback Page
 *
 * Handles OAuth callback with PKCE flow:
 * 1. Receives code from URL query params
 * 2. Exchanges code for session using exchangeCodeForSession()
 * 3. Waits for auth state change to ensure session is propagated
 * 4. Redirects to stored return URL or home page
 * 5. Shows loading state during processing
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("processing"); // processing, success, error

  const redirectTimeoutRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);
  const authStateListenerRef = useRef(null);

  useEffect(() => {
    if (_callbackExchangeStarted) return;

    const goToReturnWithError = (errorMessage) => {
      const returnTo = validateReturnTo(sessionStorage.getItem("auth:returnTo"));
      sessionStorage.removeItem("auth:returnTo");
      navigate(`${returnTo}?authError=${encodeURIComponent(errorMessage || "auth_failed")}`, { replace: true });
    };

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          setError(errorDescription || errorParam || "Authentication failed");
          setStatus("error");
          redirectTimeoutRef.current = setTimeout(() => goToReturnWithError(errorDescription || errorParam), 2000);
          return;
        }

        if (!code) {
          setError("Missing authorization code. Please try signing in again.");
          setStatus("error");
          redirectTimeoutRef.current = setTimeout(() => goToReturnWithError("missing_code"), 2000);
          return;
        }

        _callbackExchangeStarted = true;

        const doExchange = () => supabase.auth.exchangeCodeForSession(code);
        let result = await doExchange();
        let { data, error: exchangeError } = result;

        // Retry once on PKCE/code_verifier errors (can be timing or storage race in production)
        const isPKCEError = (msg) =>
          msg?.includes("code verifier") || msg?.includes("both auth code and code verifier");
        if (exchangeError && isPKCEError(exchangeError.message)) {
          await new Promise((r) => setTimeout(r, 500));
          result = await doExchange();
          exchangeError = result.error;
          data = result.data;
        }

        if (exchangeError) {
          const isPkce = isPKCEError(exchangeError.message);
          setError(
            isPkce
              ? "Sign-in couldn't be completed. The sign-in link may have expired or was opened in a different browser. Please try again."
              : exchangeError.message || "Failed to complete sign in"
          );
          setStatus("error");
          redirectTimeoutRef.current = setTimeout(
            () => goToReturnWithError(exchangeError.message || "auth_failed"),
            4000
          );
          return;
        }

        if (data?.session) {
          // Only log non-sensitive info (email is safe)
          // console.log("Session created successfully, user:", data.session.user?.email); // prod: no console
          
          // Get and validate return URL from sessionStorage
          const returnTo = validateReturnTo(sessionStorage.getItem("auth:returnTo"));
          sessionStorage.removeItem("auth:returnTo");
          
          // Wait for auth state change event to ensure session is propagated to AuthContext
          // This prevents race conditions where we redirect before the context updates
          let authStateReceived = false;
          let redirectExecuted = false;
          
          const redirectAfterAuthState = () => {
            if (redirectExecuted) return;
            redirectExecuted = true;
            setStatus("success");
            
            // Small delay to show success state, then redirect
            redirectTimeoutRef.current = setTimeout(() => {
              // console.log("Redirecting to:", returnTo); // prod: no console
              try {
                navigate(returnTo, { replace: true });
              } catch (navError) {
                // console.error("Navigation error:", navError); // prod: no console
                // Fallback to window.location if navigate fails
                window.location.href = returnTo;
              }
            }, 500);
          };

          // Verify session is actually set by checking immediately
          const verifySession = async () => {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session) {
                // console.log("Session verified, proceeding with redirect"); // prod: no console
                redirectAfterAuthState();
              }
            } catch (err) {
              // console.error("Session verification failed:", err); // prod: no console
              // Continue anyway - the exchange was successful
              redirectAfterAuthState();
            }
          };

          // Set up auth state listener to wait for SIGNED_IN event
          const { data: authStateData } = supabase.auth.onAuthStateChange((event, session) => {
            // console.log("Auth state change in callback:", event, session ? "has session" : "no session"); // prod: no console
            if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
              authStateReceived = true;
              redirectAfterAuthState();
            }
          });
          authStateListenerRef.current = authStateData;

          // Verify session immediately (in case event already fired)
          verifySession();

          // Fallback: if auth state change doesn't fire within 2 seconds, redirect anyway
          // This handles edge cases where the event might not fire
          fallbackTimeoutRef.current = setTimeout(() => {
            if (!redirectExecuted) {
              // console.warn("Auth state change event not received within timeout, redirecting anyway"); // prod: no console
              redirectAfterAuthState();
            }
          }, 2000);
        } else {
          setError("Session creation failed");
          setStatus("error");
          redirectTimeoutRef.current = setTimeout(() => goToReturnWithError("session_failed"), 2000);
        }
      } catch (err) {
        setError(err.message || "An unexpected error occurred");
        setStatus("error");
        redirectTimeoutRef.current = setTimeout(() => goToReturnWithError("unexpected_error"), 2000);
      }
    };

    handleCallback();

    // Cleanup: clear timeouts and unsubscribe. Reset guard after delay so StrictMode remount
    // doesn't run exchange again, but a later navigation back to this page can.
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      if (authStateListenerRef.current?.subscription) {
        authStateListenerRef.current.subscription.unsubscribe();
      }
      setTimeout(() => {
        _callbackExchangeStarted = false;
      }, 100);
    };
  }, [searchParams, navigate]);

  return (
    <>
      <SEOHead
        title="Sign-in callback"
        description="Completing sign-in."
        pathname="/auth/callback"
        noindex
      />
      <div className="auth-callback-page">
      <div className="auth-callback-container">
        <div className="auth-callback-content">
          <ShieldLogo size={64} />
          <h1 className="auth-callback-title">ExtensionShield</h1>
          
          {status === "processing" && (
            <>
              <div className="auth-callback-spinner">
                <div className="spinner-ring"></div>
              </div>
              <p className="auth-callback-message">Signing you in...</p>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="auth-callback-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="auth-callback-message">Success! Redirecting...</p>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="auth-callback-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="auth-callback-message error">{error || "Authentication failed"}</p>
              <p className="auth-callback-submessage">Redirecting shortly, or click below to go now.</p>
              <button
                type="button"
                className="auth-callback-try-again"
                onClick={() => {
                  if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
                  const returnTo = validateReturnTo(sessionStorage.getItem("auth:returnTo"));
                  sessionStorage.removeItem("auth:returnTo");
                  navigate(returnTo || "/", { replace: true });
                }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default AuthCallbackPage;

