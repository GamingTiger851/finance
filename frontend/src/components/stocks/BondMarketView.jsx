import React from 'react';

const CCIL_MARKET_WATCH = 'https://www.ccilindia.com/market-watch';

export default function BondMarketView() {
    return (
        <section className="page-view bond-market-page" aria-labelledby="bond-market-title">
            <header className="page-header bond-market-header">
                <div>
                    <h1 className="page-title" id="bond-market-title">Indian Bond Market</h1>
                    <p className="page-subtitle">Government securities, State Development Loans, and Treasury bill market watch.</p>
                </div>
                <a className="btn btn-primary bond-market-open" href={CCIL_MARKET_WATCH} target="_blank" rel="noopener noreferrer">
                    Open CCIL Market Watch <span aria-hidden="true">↗</span>
                </a>
            </header>

            <div className="bond-market-source" role="note">
                <span className="bond-market-source-dot" aria-hidden="true" />
                <div>
                    <strong>Official CCIL market watch</strong>
                    <p>Quotes and yields are provided by The Clearing Corporation of India. Availability and update frequency follow the source market.</p>
                </div>
            </div>

            <div className="bond-market-unavailable" role="status">
                <div className="bond-market-unavailable-icon" aria-hidden="true">↗</div>
                <div>
                    <h2>View live quotes on CCIL</h2>
                    <p>CCIL does not allow its market watch to load inside this page. Open the official market watch directly to view current government bond and Treasury bill quotes and yields.</p>
                    <a className="btn btn-primary bond-market-open" href={CCIL_MARKET_WATCH} target="_blank" rel="noopener noreferrer">
                        Open official live market watch <span aria-hidden="true">↗</span>
                    </a>
                </div>
            </div>
            <div className="bond-market-segments" aria-label="Available market segments">
                <span>Central Government Securities</span>
                <span>State Government Securities</span>
                <span>Treasury Bills</span>
                <span>When Issued</span>
            </div>
        </section>
    );
}
