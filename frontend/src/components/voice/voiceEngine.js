// voiceEngine.js

export class VoiceEngine {
    constructor(onResult, onStatusChange, onAction) {
        this.onResult = onResult;
        this.onStatusChange = onStatusChange; // 'idle', 'listening', 'speaking', 'error'
        this.onAction = onAction; // Callback for app actions (navigate, toggleTheme, financeQuery)
        
        this.language = 'en-US'; // Default to English
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.initSpeechRecognition();
        
        // Load voices
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => {
                this.voices = this.synthesis.getVoices();
            };
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition API is not supported in this browser.");
            this.recognition = null;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;

        this.recognition.onstart = () => {
            this.onStatusChange('listening');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                this.onResult(finalTranscript, true);
                this.parseIntent(finalTranscript);
            } else {
                this.onResult(interimTranscript, false);
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            this.onStatusChange('error');
        };

        this.recognition.onend = () => {
            // Only change to idle if we aren't already speaking
            if (!this.synthesis.speaking) {
                this.onStatusChange('idle');
            }
        };
    }

    setLanguage(lang) {
        if (lang === 'ta') {
            this.language = 'ta-IN';
        } else {
            this.language = 'en-US';
        }
        if (this.recognition) {
            this.recognition.lang = this.language;
        }
    }

    toggleLanguage() {
        this.setLanguage(this.language === 'en-US' ? 'ta' : 'en');
        return this.language;
    }

    startListening() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch(e) {
                console.error("Could not start recognition:", e);
            }
        }
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    speak(text, langCode = this.language) {
        if (!this.synthesis) return;
        
        this.synthesis.cancel(); // Stop any current speech
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.95; // Slightly slower for natural feel
        utterance.pitch = 1.05;

        // Try to find a good voice
        if (this.voices.length === 0) {
            this.voices = this.synthesis.getVoices();
        }

        let selectedVoice = null;
        if (this.voices.length > 0) {
            if (langCode === 'ta-IN') {
                selectedVoice = this.voices.find(v => v.lang === 'ta-IN');
            } else {
                selectedVoice = this.voices.find(v => v.lang === 'en-IN') || this.voices.find(v => v.lang === 'en-US' && v.name.includes('Female'));
            }
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => this.onStatusChange('speaking');
        utterance.onend = () => this.onStatusChange('idle');
        utterance.onerror = () => this.onStatusChange('idle');

        this.synthesis.speak(utterance);
    }

    parseIntent(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        let intentHandled = false;

        const navMap = [
            { keywords: ['dashboard', 'home', 'டாஷ்போர்டு', 'முகப்பு'], action: { type: 'NAVIGATE', payload: 'dashboard' }, responseEN: 'Navigating to Dashboard', responseTA: 'டாஷ்போர்டுக்கு செல்கிறேன்' },
            { keywords: ['balance', 'இருப்பு', 'பேலன்ஸ்'], action: { type: 'FINANCE_QUERY', payload: 'balance' } },
            { keywords: ['expense', 'spend', 'செலவு', 'பரிவர்த்தனை'], action: { type: 'NAVIGATE', payload: 'expenses' }, responseEN: 'Opening Expenses', responseTA: 'செலவுகள் பக்கத்தை திறக்கிறேன்' },
            { keywords: ['budget', 'பட்ஜெட்', 'வரவு செலவு'], action: { type: 'NAVIGATE', payload: 'budget' }, responseEN: 'Opening Budget Planner', responseTA: 'பட்ஜெட் திட்டத்தை திறக்கிறேன்' },
            { keywords: ['analytic', 'trend', 'பகுப்பாய்வு', 'அனலிட்டிக்ஸ்'], action: { type: 'NAVIGATE', payload: 'analytics' }, responseEN: 'Opening Analytics', responseTA: 'பகுப்பாய்வு பக்கத்தை திறக்கிறேன்' },
            { keywords: ['report', 'export', 'அறிக்கை', 'ஏற்றுமதி'], action: { type: 'NAVIGATE', payload: 'reports' }, responseEN: 'Opening Reports', responseTA: 'அறிக்கைகளை திறக்கிறேன்' },
            { keywords: ['dark mode', 'dark', 'இருண்ட'], action: { type: 'TOGGLE_THEME', payload: 'dark' }, responseEN: 'Switching to dark mode', responseTA: 'இருண்ட பயன்முறைக்கு மாற்றுகிறேன்' },
            { keywords: ['light mode', 'light', 'வெளிச்ச'], action: { type: 'TOGGLE_THEME', payload: 'light' }, responseEN: 'Switching to light mode', responseTA: 'வெளிச்ச பயன்முறைக்கு மாற்றுகிறேன்' }
        ];

        for (const mapping of navMap) {
            if (mapping.keywords.some(kw => lowerTranscript.includes(kw))) {
                intentHandled = true;
                
                if (mapping.action.type === 'FINANCE_QUERY') {
                    // Let the React component handle the query and trigger speech
                    this.onAction(mapping.action);
                } else {
                    if (this.language === 'ta-IN' && mapping.responseTA) {
                        this.speak(mapping.responseTA, 'ta-IN');
                    } else if (mapping.responseEN) {
                        this.speak(mapping.responseEN, 'en-US');
                    }
                    this.onAction(mapping.action);
                }
                break;
            }
        }

        if (!intentHandled) {
            // General AI query or fallback
            if (this.language === 'ta-IN') {
                this.speak("மன்னிக்கவும், எனக்கு புரியவில்லை. மீண்டும் சொல்லவும்.", 'ta-IN');
            } else {
                this.speak("Sorry, I didn't catch that. Can you repeat?", 'en-US');
            }
        }
    }
}
