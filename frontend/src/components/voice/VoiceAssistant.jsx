import React, { useState, useEffect, useRef } from 'react';
import { VoiceEngine } from './voiceEngine';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import './VoiceAssistant.css';

const VoiceAssistant = ({ onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle', 'listening', 'speaking', 'error'
    const [transcript, setTranscript] = useState('');
    const [language, setLanguage] = useState('en-US');
    const engineRef = useRef(null);
    
    const { calculateTotals } = useFinance();
    const { toggleDarkMode } = useAuth(); // Assuming there's a toggle method or we can set it

    useEffect(() => {
        engineRef.current = new VoiceEngine(
            (text, isFinal) => {
                setTranscript(text);
            },
            (newStatus) => {
                setStatus(newStatus);
            },
            (action) => {
                handleAction(action);
            }
        );

        return () => {
            if (engineRef.current) {
                engineRef.current.stopListening();
            }
        };
    }, []);

    const handleAction = (action) => {
        if (action.type === 'NAVIGATE') {
            onNavigate(action.payload);
            setTimeout(() => setIsOpen(false), 2000); // Close after navigating
        } else if (action.type === 'TOGGLE_THEME') {
            if (toggleDarkMode) toggleDarkMode();
            setTimeout(() => setIsOpen(false), 2000);
        } else if (action.type === 'FINANCE_QUERY') {
            let response = '';
            let langCode = engineRef.current.language;
            const totals = calculateTotals();
            
            if (action.payload === 'balance') {
                const bal = totals.balance;
                if (langCode === 'ta-IN') {
                    response = `உங்கள் தற்போதைய இருப்பு ரூபாய் ${bal}`;
                } else {
                    response = `Your current balance is ${bal} dollars`;
                }
            } else if (action.payload === 'expenses') {
                const exp = totals.expense;
                if (langCode === 'ta-IN') {
                    response = `உங்கள் மொத்த செலவு ரூபாய் ${exp}`;
                } else {
                    response = `Your total expenses are ${exp} dollars`;
                }
            }
            
            if (response) {
                engineRef.current.speak(response, langCode);
            }
        }
    };

    const toggleVoiceAssistant = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setTranscript('');
            if (engineRef.current) engineRef.current.startListening();
        } else {
            if (engineRef.current) engineRef.current.stopListening();
        }
    };

    const handleToggleLanguage = () => {
        if (engineRef.current) {
            const newLang = engineRef.current.toggleLanguage();
            setLanguage(newLang);
        }
    };

    const handleMicClick = () => {
        if (status === 'listening') {
            engineRef.current.stopListening();
        } else {
            engineRef.current.startListening();
        }
    };

    return (
        <>
            {/* Floating Orb */}
            <div className={`voice-orb ${status}`} onClick={toggleVoiceAssistant}>
                <div className="orb-core">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="22"></line>
                    </svg>
                </div>
                <div className="orb-ring ring-1"></div>
                <div className="orb-ring ring-2"></div>
            </div>

            {/* Modal */}
            {isOpen && (
                <div className="voice-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div className="voice-modal" onClick={e => e.stopPropagation()}>
                        <div className="voice-modal-header">
                            <h3>HAWKS Intelligence Voice</h3>
                            <button className="lang-toggle-btn" onClick={handleToggleLanguage}>
                                {language === 'en-US' ? 'EN / தமிழ்' : 'தமிழ் / EN'}
                            </button>
                        </div>
                        
                        <div className="voice-modal-body">
                            <div className={`status-indicator ${status}`}>
                                {status === 'idle' && 'Tap mic to speak'}
                                {status === 'listening' && 'Listening...'}
                                {status === 'speaking' && 'Speaking...'}
                                {status === 'error' && 'Error. Try again.'}
                            </div>
                            
                            <div className="transcript-area">
                                {transcript || (language === 'en-US' ? 'Say something like "Check balance" or "Open budget"' : '"எனது இருப்பை காட்டு" என்று சொல்லுங்கள்')}
                            </div>

                            {/* Soundwave animation */}
                            <div className={`soundwave ${status}`}>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                                <div className="bar"></div>
                            </div>
                        </div>

                        <div className="voice-modal-footer">
                            <button className={`mic-btn ${status}`} onClick={handleMicClick}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="22"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoiceAssistant;
