const fs = require('fs');
let c = fs.readFileSync('d:/Finance/frontend/src/index.css', 'utf8');

// The original string exactly as it is without dealing with \r\n vs \n explicitly, just regex it
c = c.replace(/\/\* Clean White Neo-Bank Base Theme - Universal across all environments \*\/[\s\S]*?--ink: var\(--accent\);\r?\n}/g, `/* Financial Stability Theme - Universal across all environments */
:root,
[data-theme],
body,
body.dark {
    --paper: #F4F6F9 !important;
    --card-bg: #FFFFFF !important;
    --card-border: #E2E8F0 !important;
    --border: #E2E8F0 !important;
    --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08) !important;

    --text: #333333 !important;
    --text-muted: #666666 !important;

    --chrome-bg: #0A3C6E !important;
    --chrome-bg-soft: rgba(255, 255, 255, 0.05) !important;
    --chrome-text: #FFFFFF !important;
    --chrome-text-dim: rgba(255, 255, 255, 0.7) !important;
    --chrome-active-bg: #1783C1 !important;
    --chrome-active-text: #FFFFFF !important;
    --chrome-border: #0A3C6E !important;

    --accent: #1783C1 !important;
    --accent-hover: #126A9C !important;
    --accent-bright: #3BA4DD !important;
    --accent-dark: #0F5882 !important;
    --accent-bg: rgba(23, 131, 193, 0.12) !important;
    --accent-gradient: linear-gradient(135deg, #1783C1 0%, #126A9C 100%) !important;
    --accent-glow: rgba(23, 131, 193, 0.25) !important;

    --income: #059669 !important;
    --income-bg: rgba(5, 150, 105, 0.12) !important;
    --expense: #ef4444 !important;
    --expense-bg: rgba(239, 68, 68, 0.12) !important;

    --radius: 16px;
    --radius-sm: 10px;

    --brass: var(--accent);
    --brass-bright: var(--accent-bright);
    --brass-bg: var(--accent-bg);
    --vault: var(--chrome-bg);
    --ink: var(--chrome-bg);
}`);

fs.writeFileSync('d:/Finance/frontend/src/index.css', c);
