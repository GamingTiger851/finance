import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { GROWW_INDICES, SECTORS_LIST, ALL_STOCKS_1000 } from '../../data/stocksData';
import StockMiniSparkline from './StockMiniSparkline';
import LiveStockChartModal from './LiveStockChartModal';
import FeaturedMarketChart from './FeaturedMarketChart';
import { fetchIndices, fetchLtpBatch, mergeWithStaticData } from '../../services/growwService';
import { checkUpstoxStatus, fetchLtp, getInstrumentKey, getQuoteForInstrument } from '../../services/upstoxService';

export default function StocksView() {
    const { showToast } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');
    const [selectedCap, setSelectedCap] = useState('all'); // 'all', 'Large Cap', 'Mid Cap', 'Small Cap'
    const [selectedSector, setSelectedSector] = useState('all');
    const [sortBy, setSortBy] = useState('mcap-desc');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(48);
    const [detailStock, setDetailStock] = useState(null);
    const [chartModalStock, setChartModalStock] = useState(null);

    // ── Groww Live Data State ─────────────────────────────────────────────────
    const [liveIndices, setLiveIndices] = useState(null);   // null = not loaded yet
    const [livePrices, setLivePrices] = useState({});     // symbol → live LTP data
    const [apiLive, setApiLive] = useState(false);  // true when Groww API returns real data
    const [lastUpdated, setLastUpdated] = useState(null);
    const [useUpstox, setUseUpstox] = useState(false);
    const [upstoxStatusChecked, setUpstoxStatusChecked] = useState(false);

    useEffect(() => {
        checkUpstoxStatus()
            .then(res => setUseUpstox(Boolean(res.connected)))
            .catch(() => setUseUpstox(false))
            .finally(() => setUpstoxStatusChecked(true));
    }, []);
    const liveIntervalRef = useRef(null);
    const indicesIntervalRef = useRef(null);

    // Fetch live indices (Nifty, Sensex etc.) every 30 seconds
    const refreshIndices = useCallback(async () => {
        const data = await fetchIndices();
        if (data && data.some(Boolean)) {
            setLiveIndices(data);
            setApiLive(true);
        }
    }, []);

    useEffect(() => {
        refreshIndices();
        indicesIntervalRef.current = setInterval(refreshIndices, 30000);
        return () => clearInterval(indicesIntervalRef.current);
    }, [refreshIndices]);

    const tabs = [
        { id: 'all', label: 'All 1,000 Equities' },
        { id: 'popular', label: '🔥 Most Bought' },
        { id: 'gainers', label: '🚀 Top Gainers' },
        { id: 'losers', label: '🔻 Top Losers' },
        { id: 'largecap', label: '🏢 Large Cap Titans' },
        { id: 'midcap', label: '⚡ High-Growth Midcaps' },
        { id: 'smallcap', label: '🌱 Emerging Smallcaps' },
        { id: 'high52', label: '🎯 Near 52W High' },
        { id: 'halal', label: '🕌 Shariah Screened' }
    ];

    // Reset to page 1 whenever search, tab, sector, cap or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTab, selectedCap, selectedSector, sortBy, itemsPerPage]);

    // Fetch Upstox quotes for the visible page (every 15 seconds).
    const refreshLivePrices = useCallback(async (stocksToFetch) => {
        if (!stocksToFetch || stocksToFetch.length === 0) return;
        let liveData = [];
        if (useUpstox) {
            try {
                const requestedStocks = stocksToFetch.slice(0, 50);
                const keys = requestedStocks.map(stock => getInstrumentKey(stock.symbol));
                const upstoxData = await fetchLtp(keys);
                liveData = requestedStocks.flatMap(stock => {
                    const key = getInstrumentKey(stock.symbol);
                    const ltp = getQuoteForInstrument(upstoxData, key);
                    const price = Number(ltp?.last_price);
                    if (!Number.isFinite(price) || price <= 0) return [];
                    const previousClose = Number(ltp?.cp);
                    const hasPreviousClose = Number.isFinite(previousClose) && previousClose > 0;
                    const change = hasPreviousClose ? price - previousClose : null;
                    return [{
                        symbol: stock.symbol,
                        ltp: price,
                        close: hasPreviousClose ? previousClose : null,
                        change,
                        changePct: hasPreviousClose ? (change / previousClose) * 100 : null,
                        isUp: hasPreviousClose ? change >= 0 : null,
                        live: true,
                    }];
                });
            } catch (err) {
                console.error('Upstox fetch failed in StocksView:', err);
                setLivePrices(previous => {
                    const next = { ...previous };
                    stocksToFetch.slice(0, 50).forEach(stock => delete next[stock.symbol.toUpperCase()]);
                    return next;
                });
                return;
            }
        } else {
            const symbols = stocksToFetch.slice(0, 50).map(s => ({ symbol: s.symbol, exchange: 'NSE' }));
            liveData = await fetchLtpBatch(symbols);
        }

        if (useUpstox) {
            const requestedSymbols = stocksToFetch.slice(0, 50).map(stock => stock.symbol.toUpperCase());
            const liveBySymbol = new Map(liveData.map(item => [item.symbol.toUpperCase(), item]));
            setLivePrices(previous => {
                const updated = { ...previous };
                requestedSymbols.forEach(symbol => delete updated[symbol]);
                liveBySymbol.forEach((item, symbol) => { updated[symbol] = item; });
                return updated;
            });
        } else if (liveData && liveData.length > 0) {
            setLivePrices(prev => {
                const updated = { ...prev };
                liveData.forEach(item => {
                    if (item && item.symbol) updated[item.symbol.toUpperCase()] = item;
                });
                return updated;
            });
        }
        if (liveData && liveData.length > 0) {
            setApiLive(true);
            setLastUpdated(new Date());
        }
    }, [useUpstox]);

    // 1. Filter and Sort Stocks Universe
    const filteredAndSortedStocks = useMemo(() => {
        let result = ALL_STOCKS_1000.filter(stock => {
            // Category Tab Filter
            if (selectedTab === 'popular' && !stock.tags.includes('popular')) return false;
            if (selectedTab === 'gainers' && (!stock.isUp || stock.changePercent < 1.0)) return false;
            if (selectedTab === 'losers' && (stock.isUp || stock.changePercent >= 0)) return false;
            if (selectedTab === 'largecap' && stock.capCategory !== 'Large Cap') return false;
            if (selectedTab === 'midcap' && stock.capCategory !== 'Mid Cap') return false;
            if (selectedTab === 'smallcap' && stock.capCategory !== 'Small Cap') return false;
            if (selectedTab === 'high52' && !stock.tags.includes('52w_high')) return false;
            if (selectedTab === 'halal' && !stock.isHalal) return false;

            // Market Cap Category Filter
            if (selectedCap !== 'all' && stock.capCategory !== selectedCap) return false;

            // Sector Filter
            if (selectedSector !== 'all' && stock.sector !== selectedSector) return false;

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                return (
                    stock.name.toLowerCase().includes(q) ||
                    stock.symbol.toLowerCase().includes(q) ||
                    stock.sector.toLowerCase().includes(q)
                );
            }

            return true;
        });

        // 2. Sorting
        result.sort((a, b) => {
            if (sortBy === 'mcap-desc') return (b.marketCapValue || 0) - (a.marketCapValue || 0);
            if (sortBy === 'mcap-asc') return (a.marketCapValue || 0) - (b.marketCapValue || 0);
            if (sortBy === 'price-desc') return b.price - a.price;
            if (sortBy === 'price-asc') return a.price - b.price;
            if (sortBy === 'change-desc') return b.changePercent - a.changePercent;
            if (sortBy === 'change-asc') return a.changePercent - b.changePercent;
            if (sortBy === 'pe-asc') return a.peRatio - b.peRatio;
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            return 0;
        });

        return result;
    }, [selectedTab, selectedCap, selectedSector, searchQuery, sortBy]);

    // Pagination calculations
    const totalStocks = filteredAndSortedStocks.length;
    const totalPages = Math.ceil(totalStocks / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalStocks);

    const displayedStocks = useMemo(() => {
        const pageStocks = filteredAndSortedStocks.slice(startIndex, endIndex);
        if (!upstoxStatusChecked) return pageStocks.map(stock => ({ ...stock, livePriceUnavailable: true }));
        const merged = mergeWithStaticData(pageStocks, Object.values(livePrices));
        if (!useUpstox) return merged;
        return merged.map(stock => livePrices[stock.symbol.toUpperCase()]?.live
            ? stock
            : { ...stock, price: null, change: null, changePercent: null, isUp: null, livePriceUnavailable: true });
    }, [filteredAndSortedStocks, startIndex, endIndex, livePrices, upstoxStatusChecked, useUpstox]);

    // Poll live prices for the current page every 15 seconds
    useEffect(() => {
        const pageStocks = filteredAndSortedStocks.slice(startIndex, endIndex);
        refreshLivePrices(pageStocks);
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = setInterval(() => refreshLivePrices(pageStocks), 15000);
        return () => clearInterval(liveIntervalRef.current);
    }, [startIndex, endIndex, filteredAndSortedStocks, refreshLivePrices]);

    // Download individual stock balance sheet
    const handleDownloadBalanceSheet = (stock) => {
        const bs = stock.balanceSheet;
        const csvContent = [
            `"COMPANY BALANCE SHEET STATEMENT - ${stock.name.toUpperCase()} (${stock.symbol})"`,
            `"Exchange: National Stock Exchange of India (NSE) / BSE"`,
            `"Sector: ${stock.sector}"`,
            `"Market Cap Category: ${stock.capCategory}"`,
            `"Current Market Price: ${stock.livePriceUnavailable || !Number.isFinite(stock.price) ? 'Unavailable (no Upstox quote)' : `₹${stock.price.toFixed(2)}`}"`,
            `"Market Capitalization: ${stock.marketCap}"`,
            `"Generated via: FinTracker Stocks Platform (Groww-Style Telemetry)"`,
            `"Date: ${new Date().toLocaleDateString('en-GB')}"`,
            `""`,
            `"FINANCIAL METRIC","STATEMENT VALUE"`,
            `"================== ASSETS & LIABILITIES ==================",""`,
            `"Total Consolidated Assets","${bs.assets}"`,
            `"Total Consolidated Liabilities","${bs.liabilities}"`,
            `"Total Net Worth / Equity","${bs.equity}"`,
            `"Net Working Capital","${bs.workingCapital}"`,
            `"Debt-to-Equity Ratio","${bs.debtToEquity}"`,
            `"Current Liquidity Ratio","${bs.currentRatio}"`,
            `""`,
            `"================== VALUATION & FUNDAMENTALS ==================",""`,
            `"Price-to-Earnings (P/E) Ratio","${stock.peRatio}"`,
            `"Price-to-Book (P/B) Ratio","${stock.pbRatio}"`,
            `"Dividend Yield","${stock.divYield}"`,
            `"52-Week High","₹${stock.high52.toFixed(2)}"`,
            `"52-Week Low","₹${stock.low52.toFixed(2)}"`,
            `"Shariah Compliance Status","${stock.isHalal ? 'Verified Halal (Passes AAOIFI)' : 'Conventional (Non-Compliant)'}"`
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${stock.symbol}_BalanceSheet_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Balance sheet for ${stock.symbol} downloaded in Excel format!`);
    };

    // Download Excel export (all stocks or filtered list)
    const handleDownloadStocksExport = (exportAll = true) => {
        const dataset = exportAll ? ALL_STOCKS_1000 : filteredAndSortedStocks;
        const headers = [
            'Symbol',
            'Company Name',
            'Sector',
            'Cap Category',
            'Market Price (INR)',
            '1D Change %',
            'Market Cap',
            'P/E Ratio',
            'P/B Ratio',
            'Dividend Yield',
            '52W High (INR)',
            '52W Low (INR)',
            'Total Assets',
            'Total Liabilities',
            'Shareholders Equity',
            'Debt to Equity',
            'Shariah Status'
        ];

        const rows = dataset.map(s => [
            `"${s.symbol}"`,
            `"${s.name}"`,
            `"${s.sector}"`,
            `"${s.capCategory}"`,
            `"${s.price.toFixed(2)}"`,
            `"${s.isUp ? '+' : ''}${s.changePercent.toFixed(2)}%"`,
            `"${s.marketCap}"`,
            `"${s.peRatio}"`,
            `"${s.pbRatio}"`,
            `"${s.divYield}"`,
            `"${s.high52.toFixed(2)}"`,
            `"${s.low52.toFixed(2)}"`,
            `"${s.balanceSheet.assets}"`,
            `"${s.balanceSheet.liabilities}"`,
            `"${s.balanceSheet.equity}"`,
            `"${s.balanceSheet.debtToEquity}"`,
            `"${s.isHalal ? 'Halal (AAOIFI)' : 'Conventional'}"`
        ]);

        const csvContent = [
            `"FINTRACKER - 1,000 STOCKS UNIVERSE DIRECTORY (GROWW / NSE SCALE)"`,
            `"Exported Date: ${new Date().toLocaleString()}"`,
            `"Records Exported: ${dataset.length}"`,
            `""`,
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `FinTracker_${dataset.length}_Stocks_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`${dataset.length} stocks exported to Excel successfully!`);
    };

    // Helper for pagination page numbers with ellipsis
    const getPaginationRange = () => {
        const delta = 2;
        const range = [];
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }
        if (currentPage - delta > 2) range.unshift('...');
        if (currentPage + delta < totalPages - 1) range.push('...');
        range.unshift(1);
        if (totalPages > 1) range.push(totalPages);
        return range;
    };

    return (
        <div id="stocksPage" className="page-view">
            {/* Header with Title and Global Actions */}
            <div className="page-header stocks-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div className="stocks-page-heading">
                    <div className="stocks-page-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>📈</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Stocks &amp; Equities</h1>
                    </div>
                    <p className="page-subtitle">
                        Complete 1,000-stock screener with live indices, market cap categories, valuation multiples, balance sheets, and bulk Excel export.
                        {apiLive ? (
                            <span style={{ marginLeft: '12px', fontSize: '11px', fontWeight: 'bold', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                🟢 Live Data{lastUpdated ? ` · prices updated ${lastUpdated.toLocaleTimeString()}` : ' · verifying prices'}
                            </span>
                        ) : (
                            <span style={{ marginLeft: '12px', fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                🟡 Fetching live prices...
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        style={{ fontSize: '13px' }}
                    >
                        {viewMode === 'grid' ? '📋 Table View' : '🗂️ Card View'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleDownloadStocksExport(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                        title="Download complete 1,000 stock database"
                    >
                        <span>📥</span> Export All 1,000 (Excel)
                    </button>
                </div>
            </div>

            {/* Groww Style Live Market Indices Bar */}
            <div className="stocks-market-indices" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px',
                marginTop: '18px',
                padding: '4px 0'
            }}>
                {(liveIndices || GROWW_INDICES).map((idx, i) => {
                    const staticIdx = GROWW_INDICES[i] || {};
                    const display = idx || staticIdx;
                    const isLive = idx && idx.live;
                    return (
                        <div
                            key={display.name}
                            className="table-card"
                            style={{
                                padding: '14px 16px',
                                background: 'var(--card-bg)',
                                border: `1px solid ${isLive ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                                borderRadius: '10px',
                                position: 'relative',
                                transition: 'border-color 0.4s'
                            }}
                        >
                            {isLive && (
                                <span style={{
                                    position: 'absolute', top: '8px', right: '10px',
                                    fontSize: '9px', fontWeight: '800', letterSpacing: '0.08em',
                                    color: '#10b981', background: 'rgba(16,185,129,0.12)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '4px', padding: '1px 5px'
                                }}>● LIVE</span>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}><div><div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{display.name}</div><div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>{display.value}</div><div style={{ fontSize: '12px', fontWeight: '700', color: display.isUp ? '#10b981' : '#ef4444', marginTop: '2px' }}>{display.change} ({display.percent})</div></div><div><StockMiniSparkline symbol={display.name} price={parseFloat(display.value?.replace(/,/g, '')) || 100} isUp={display.isUp} width={70} height={30} /></div></div>
                        </div>
                    );
                })}
            </div>

            {/* Featured Live Equities & Benchmark Graph */}
            {useUpstox && <FeaturedMarketChart onOpenStockModal={(stock) => setChartModalStock(stock)} />}

            {/* Groww Category Quick Tabs */}
            <div className="stocks-category-tabs" style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                marginTop: '20px',
                paddingBottom: '4px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`pill ${selectedTab === tab.id ? 'active' : ''}`}
                        onClick={() => setSelectedTab(tab.id)}
                        style={{
                            fontSize: '13px',
                            padding: '8px 16px',
                            whiteSpace: 'nowrap',
                            borderRadius: '20px',
                            fontWeight: selectedTab === tab.id ? '700' : '500'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search, Sort, Sector, and Cap Toolbar */}
            <div className="table-card stocks-filter-panel" style={{
                padding: '16px 20px',
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
            }}>
                {/* Top Row: Search & Sorting */}
                <div className="stocks-filter-primary-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div className="search-box" style={{ width: '100%', maxWidth: '380px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M16 16L21 21" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search among 1,000 stocks (e.g. Reliance, TCS, HDFC)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 6px', fontSize: '14px' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="stocks-sort-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Sort By:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '13px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="mcap-desc">Market Cap (High to Low)</option>
                            <option value="mcap-asc">Market Cap (Low to High)</option>
                            <option value="price-desc">Price (High to Low)</option>
                            <option value="price-asc">Price (Low to High)</option>
                            <option value="change-desc">Top Gainers (1D %)</option>
                            <option value="change-asc">Top Losers (1D %)</option>
                            <option value="pe-asc">P/E Ratio (Value / Low to High)</option>
                            <option value="name-asc">Alphabetical (A to Z)</option>
                        </select>

                        {/* Items per page selector */}
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            style={{
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                fontSize: '13px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                            title="Stocks per page"
                        >
                            <option value={24}>24 / page</option>
                            <option value={48}>48 / page</option>
                            <option value={96}>96 / page</option>
                            <option value={120}>120 / page</option>
                        </select>
                    </div>
                </div>

                {/* Bottom Row: Cap and Sector Filters */}
                <div className="stocks-filter-secondary-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)'
                }}>
                    {/* Cap Category Filter */}
                    <div className="stocks-cap-filters" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Cap:</span>
                        {['all', 'Large Cap', 'Mid Cap', 'Small Cap'].map(cap => (
                            <button
                                key={cap}
                                type="button"
                                className={`pill ${selectedCap === cap ? 'active' : ''}`}
                                onClick={() => setSelectedCap(cap)}
                                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                            >
                                {cap === 'all' ? 'All Caps' : cap}
                            </button>
                        ))}
                    </div>

                    <div className="stocks-filter-divider" style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

                    {/* Sector Dropdown */}
                    <div className="stocks-sector-filter" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Sector:</span>
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            style={{
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12.5px',
                                outline: 'none',
                                cursor: 'pointer',
                                flex: 1,
                                maxWidth: '300px'
                            }}
                        >
                            <option value="all">All Sectors (18 Industries)</option>
                            {SECTORS_LIST.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Filters */}
                    {(selectedTab !== 'all' || selectedCap !== 'all' || selectedSector !== 'all' || searchQuery || sortBy !== 'mcap-desc') && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setSelectedTab('all');
                                setSelectedCap('all');
                                setSelectedSector('all');
                                setSearchQuery('');
                                setSortBy('mcap-desc');
                            }}
                            style={{ fontSize: '11.5px', padding: '4px 10px' }}
                        >
                            ↺ Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Results Count Banner and Current Page Range */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '0 4px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <span>
                    Showing <strong>{totalStocks === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong>{totalStocks.toLocaleString()}</strong> listed equities
                    {totalStocks < 1000 && <span style={{ marginLeft: '6px', fontSize: '11.5px', color: '#60a5fa' }}>(filtered from 1,000 stocks)</span>}
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {apiLive && lastUpdated && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#10b981', fontWeight: '600' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                            LIVE · {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    {!apiLive && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }} title="Register your server IP on groww.in/trade-api/api-keys to enable live prices">
                            ⚠ Static prices
                        </span>
                    )}
                    {totalStocks > 0 && totalStocks < 1000 && (
                        <button
                            type="button"
                            onClick={() => handleDownloadStocksExport(false)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '12.5px', textDecoration: 'underline', padding: 0 }}
                        >
                            📥 Export Filtered ({totalStocks}) to Excel
                        </button>
                    )}
                    <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                </div>
            </div>

            {/* Empty Search State */}
            {displayedStocks.length === 0 && (
                <div className="table-card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '20px' }}>
                    <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No matching stocks found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0' }}>
                        No companies matched your filter criteria among the 1,000 equities universe.
                    </p>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setSelectedTab('all');
                            setSelectedCap('all');
                            setSelectedSector('all');
                            setSearchQuery('');
                        }}
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* View Mode: Grid Cards (Groww Style) */}
            {viewMode === 'grid' && displayedStocks.length > 0 && (
                <div className="stocks-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px', marginTop: '14px' }}>
                    {displayedStocks.map(stock => (
                        <div
                            key={stock.symbol}
                            className="table-card stock-card"
                            style={{
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'transform 0.15s ease, border-color 0.15s ease'
                            }}
                        >
                            <div>
                                {/* Header: Icon, Symbol, Price */}
                                <div className="stock-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div className="stock-card-identity" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '10px',
                                            background: stock.logoBg,
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            letterSpacing: '0.02em',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}>
                                            {stock.symbol.slice(0, 3)}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                    {stock.symbol}
                                                </span>
                                                {stock.isHalal && (
                                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '700' }} title="AAOIFI Shariah Compliant">
                                                        🕌 Halal
                                                    </span>
                                                )}
                                        {stock.livePrice && (
                                                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: '800', letterSpacing: '0.08em', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                        ● LIVE
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {stock.name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Live Sparkline Chart */}
                                    {!stock.livePriceUnavailable && <div
                                        className="stock-card-sparkline"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setChartModalStock(stock)}
                                        title="Click to expand interactive Live Chart"
                                    >
                                        <StockMiniSparkline
                                            symbol={stock.symbol}
                                            price={stock.price}
                                            changePercent={stock.changePercent}
                                            isUp={stock.isUp}
                                            width={92}
                                            height={34}
                                        />
                                    </div>}

                                    {/* Price and Day Change */}
                                    <div className="stock-card-quote" style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: stock.livePriceUnavailable ? '12px' : '17px', fontWeight: '800', color: stock.livePriceUnavailable ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                            {stock.livePriceUnavailable ? 'Waiting for Upstox quote' : `₹${stock.price.toFixed(2)}`}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: '700', color: stock.isUp ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                                            {stock.livePriceUnavailable || stock.changePercent == null ? 'Change unavailable' : `${stock.isUp ? '+' : ''}${stock.change.toFixed(2)} (${stock.isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%)`}
                                        </div>
                                    </div>
                                </div>

                                {/* Sector & Cap Badge Strip */}
                                <div className="stock-card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '11.5px', marginBottom: '14px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{stock.sector}</span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            background: stock.capCategory === 'Large Cap' ? 'rgba(59, 130, 246, 0.15)' : (stock.capCategory === 'Mid Cap' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(168, 85, 247, 0.15)'),
                                            color: stock.capCategory === 'Large Cap' ? '#60a5fa' : (stock.capCategory === 'Mid Cap' ? '#fbbf24' : '#c084fc'),
                                            fontWeight: '700'
                                        }}>
                                            {stock.capCategory}
                                        </span>
                                        <span><strong>{stock.marketCap}</strong></span>
                                    </div>
                                </div>

                                {/* Mini Fundamentals Grid */}
                                <div className="stock-card-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P/E RATIO</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>{stock.peRatio}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>52W HIGH</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px', color: '#10b981' }}>₹{stock.high52.toFixed(0)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DIV YIELD</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>{stock.divYield}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions with Live Chart */}
                            <div className="stock-card-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setChartModalStock(stock)}
                                    style={{
                                        fontSize: '11px',
                                        padding: '7px 6px',
                                        justifyContent: 'center',
                                        fontWeight: '700',
                                        color: '#ADFF41',
                                        borderColor: 'rgba(173, 255, 65, 0.35)',
                                        background: 'rgba(173, 255, 65, 0.05)'
                                    }}
                                    title="Open Interactive Live Chart"
                                >
                                    📈 Live Chart
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setDetailStock(stock)}
                                    style={{ fontSize: '11px', padding: '7px 4px', justifyContent: 'center' }}
                                >
                                    👁️ Info
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleDownloadBalanceSheet(stock)}
                                    style={{ fontSize: '11px', padding: '7px 6px', justifyContent: 'center', fontWeight: '700' }}
                                >
                                    📥 Sheet
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View Mode: Classic Table View */}
            {viewMode === 'table' && displayedStocks.length > 0 && (
                <div className="table-card" style={{ marginTop: '16px' }}>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Sector</th>
                                    <th>Cap Tier</th>
                                    <th>Market Price</th>
                                    <th>1D Return</th>
                                    <th>Trend</th>
                                    <th>Market Cap</th>
                                    <th>P/E Ratio</th>
                                    <th>52W Range</th>
                                    <th>Shariah Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedStocks.map(stock => (
                                    <tr key={stock.symbol}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: stock.logoBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '11px' }}>
                                                    {stock.symbol.slice(0, 3)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{stock.symbol}</div>
                                                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{stock.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stock.sector}</td>
                                        <td>
                                            <span style={{
                                                fontSize: '10.5px',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                background: stock.capCategory === 'Large Cap' ? 'rgba(59, 130, 246, 0.15)' : (stock.capCategory === 'Mid Cap' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(168, 85, 247, 0.15)'),
                                                color: stock.capCategory === 'Large Cap' ? '#60a5fa' : (stock.capCategory === 'Mid Cap' ? '#fbbf24' : '#c084fc'),
                                                fontWeight: '700'
                                            }}>
                                                {stock.capCategory}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '800' }}>{stock.livePriceUnavailable ? 'Waiting for Upstox quote' : `₹${stock.price.toFixed(2)}`}</td>
                                        <td style={{ fontWeight: '700', color: stock.isUp ? '#10b981' : '#ef4444' }}>
                                            {stock.livePriceUnavailable || stock.changePercent == null ? '—' : `${stock.isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`}
                                        </td>
                                        <td>
                                            {!stock.livePriceUnavailable && <div
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setChartModalStock(stock)}
                                                title="Open Interactive Live Chart"
                                            >
                                                <StockMiniSparkline
                                                    symbol={stock.symbol}
                                                    price={stock.price}
                                                    changePercent={stock.changePercent}
                                                    isUp={stock.isUp}
                                                    width={78}
                                                    height={24}
                                                />
                                            </div>}
                                        </td>
                                        <td>{stock.marketCap}</td>
                                        <td>{stock.peRatio}</td>
                                        <td style={{ fontSize: '12px' }}>
                                            ₹{stock.low52.toFixed(0)} - ₹{stock.high52.toFixed(0)}
                                        </td>
                                        <td>
                                            {stock.isHalal ? (
                                                <span style={{ color: '#10b981', fontWeight: '700', fontSize: '12px' }}>✓ Compliant</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Conventional</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setChartModalStock(stock)}
                                                    style={{ padding: '4px 7px', fontSize: '11px', color: '#ADFF41', borderColor: 'rgba(173, 255, 65, 0.3)' }}
                                                    title="Open Interactive Live Chart"
                                                >
                                                    📈 Chart
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setDetailStock(stock)}
                                                    style={{ padding: '4px 7px', fontSize: '11px' }}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleDownloadBalanceSheet(stock)}
                                                    style={{ padding: '4px 7px', fontSize: '11px' }}
                                                >
                                                    📥 Sheet
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="stocks-pagination" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '24px',
                    padding: '12px 16px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalStocks} total stocks)
                    </div>

                    <div className="stocks-pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* First Button */}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="First Page"
                        >
                            « First
                        </button>

                        {/* Prev Button */}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                            ‹ Prev
                        </button>

                        {/* Numeric Page Buttons */}
                        {getPaginationRange().map((p, i) => {
                            if (p === '...') {
                                return <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>;
                            }
                            return (
                                <button
                                    key={`page-${p}`}
                                    type="button"
                                    className={`stocks-page-number btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setCurrentPage(p)}
                                    style={{
                                        minWidth: '32px',
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        fontWeight: currentPage === p ? '700' : '500'
                                    }}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        {/* Next Button */}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                            Next ›
                        </button>

                        {/* Last Button */}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="Last Page"
                        >
                            Last »
                        </button>
                    </div>
                </div>
            )}

            {/* Fundamentals & Balance Sheet Inspector Modal */}
            {detailStock && (
                <div className="modal-overlay" onClick={() => setDetailStock(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>
                                    {detailStock.name} ({detailStock.symbol})
                                </h3>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {detailStock.sector} · {detailStock.capCategory} · NSE / BSE Listed
                                </span>
                            </div>
                            <button type="button" className="close-btn" onClick={() => setDetailStock(null)}>✕</button>
                        </div>

                        <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                                {detailStock.about}
                            </p>

                            {/* Valuation Highlights */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '10px' }}>
                                    Key Fundamental Metrics
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>Market Price: <strong>{detailStock.livePriceUnavailable || !Number.isFinite(detailStock.price) ? 'Unavailable (no Upstox quote)' : `₹${detailStock.price.toFixed(2)}`}</strong></div>
                                    <div>Market Cap: <strong>{detailStock.marketCap}</strong></div>
                                    <div>P/E Ratio: <strong>{detailStock.peRatio}</strong></div>
                                    <div>P/B Ratio: <strong>{detailStock.pbRatio}</strong></div>
                                    <div>Dividend Yield: <strong>{detailStock.divYield}</strong></div>
                                    <div>52W High: <strong style={{ color: '#10b981' }}>₹{detailStock.high52.toFixed(2)}</strong></div>
                                    <div>52W Low: <strong style={{ color: '#ef4444' }}>₹{detailStock.low52.toFixed(2)}</strong></div>
                                    <div>Shariah: <strong>{detailStock.isHalal ? '✓ Compliant' : 'Conventional'}</strong></div>
                                </div>
                            </div>

                            {/* Balance Sheet Summary */}
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '10px' }}>
                                    Consolidated Balance Sheet Summary
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>Total Assets: <strong>{detailStock.balanceSheet.assets}</strong></div>
                                    <div>Total Liabilities: <strong>{detailStock.balanceSheet.liabilities}</strong></div>
                                    <div>Total Equity: <strong>{detailStock.balanceSheet.equity}</strong></div>
                                    <div>Working Capital: <strong>{detailStock.balanceSheet.workingCapital}</strong></div>
                                    <div>Debt-to-Equity: <strong>{detailStock.balanceSheet.debtToEquity}</strong></div>
                                    <div>Current Ratio: <strong>{detailStock.balanceSheet.currentRatio}</strong></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ color: '#ADFF41', borderColor: 'rgba(173, 255, 65, 0.4)' }}
                                onClick={() => {
                                    const s = detailStock;
                                    setDetailStock(null);
                                    setChartModalStock(s);
                                }}
                            >
                                📈 Open Live Chart
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setDetailStock(null)}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    handleDownloadBalanceSheet(detailStock);
                                    setDetailStock(null);
                                }}
                            >
                                📥 Download Excel Balance Sheet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Live Stock Chart Modal */}
            {chartModalStock && (
                <LiveStockChartModal
                    stock={chartModalStock}
                    onClose={() => setChartModalStock(null)}
                    onDownloadBalanceSheet={handleDownloadBalanceSheet}
                />
            )}
        </div>
    );
}

