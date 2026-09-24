import React from 'react';

/**
 * AppFooter Component
 * Displays the project name and the engineering team "HAWKS Intelligence" attribution.
 * Styled matching the institutional presentation footer (BSc AI Student, New College).
 */
export default function AppFooter({ className = '' }) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={`app-project-footer ${className}`}>
            <div className="project-footer-inner">
                {/* Left: Project Name Watermark */}
                <div className="footer-left">
                    <div className="footer-brand-spark" style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        background: '#090D16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        padding: '1px'
                    }}>
                        <img
                            src="/logo.png"
                            alt="HAWKS"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                    <span className="footer-project-name">FinTracker AI</span>
                    <span className="footer-divider-dot">•</span>
                    <span className="footer-project-tag">Smart Wealth &amp; Investment</span>
                </div>

                {/* Right: Team Attribution & College */}
                <div className="footer-right">
                    <span className="footer-attribution-text">
                        Prepared by <strong className="team-highlight">Team HAWKS Intelligence</strong>
                    </span>
                    <span className="footer-divider-dot">•</span>
                    <span className="footer-college-tag">BSc AI Student, New College</span>
                </div>
            </div>
        </footer>
    );
}
