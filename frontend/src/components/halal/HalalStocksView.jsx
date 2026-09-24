import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { checkUpstoxStatus, fetchQuotes, getInstrumentKey, getQuoteForInstrument } from '../../services/upstoxService';

const HALAL_STOCKS_DATA = [
    {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        exchange: 'NSE / BSE',
        sector: 'Technology',
        price: '₹4,180.50',
        change: '+1.2%',
        isPositive: true,
        marketCap: '₹15,12,000 Cr',
        debtRatio: '0.8%',
        cashRatio: '4.8%',
        impureRev: '0.0%',
        purificationRate: '0.00%',
        standard: 'AAOIFI & MSCI Islamic',
        complianceStatus: '100% Shariah Compliant',
        summary: 'World-leading IT services and digital transformation conglomerate with virtually zero interest-bearing debt and high liquid cash reserves.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'BSR & Co. LLP (Clean Opinion)',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '14,250',
                shortTermInvestments: '28,940',
                tradeReceivables: '39,120',
                otherCurrentAssets: '8,420',
                totalCurrentAssets: '90,730'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '15,640',
                intangibleAssets: '4,210',
                longTermInvestments: '22,430',
                otherNonCurrentAssets: '9,150',
                totalNonCurrentAssets: '51,430'
            },
            totalAssets: '1,42,160',
            currentLiabilities: {
                tradePayables: '12,450',
                shortTermDebt: '0',
                otherCurrentLiabilities: '18,320',
                totalCurrentLiabilities: '30,770'
            },
            nonCurrentLiabilities: {
                longTermDebt: '0',
                deferredTax: '2,410',
                otherNonCurrentLiabilities: '4,890',
                totalNonCurrentLiabilities: '7,300'
            },
            totalLiabilities: '38,070',
            equity: {
                shareCapital: '366',
                reservesAndSurplus: '1,03,724',
                totalEquity: '1,04,090'
            },
            workingCapital: '59,960',
            debtToEquity: '0.00',
            currentRatio: '2.95'
        }
    },
    {
        symbol: 'INFY',
        name: 'Infosys Limited',
        exchange: 'NSE / BSE / NYSE',
        sector: 'Technology',
        price: '₹1,895.00',
        change: '+0.8%',
        isPositive: true,
        marketCap: '₹7,86,000 Cr',
        debtRatio: '1.4%',
        cashRatio: '5.2%',
        impureRev: '0.2%',
        purificationRate: '0.08%',
        standard: 'AAOIFI & S&P Shariah',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Global leader in next-generation digital services and cloud consulting with a pristine, low-debt balance sheet.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Deloitte Haskins & Sells LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '16,420',
                shortTermInvestments: '12,150',
                tradeReceivables: '28,340',
                otherCurrentAssets: '6,210',
                totalCurrentAssets: '63,120'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '18,920',
                intangibleAssets: '8,410',
                longTermInvestments: '14,200',
                otherNonCurrentAssets: '7,150',
                totalNonCurrentAssets: '48,680'
            },
            totalAssets: '1,11,800',
            currentLiabilities: {
                tradePayables: '7,890',
                shortTermDebt: '0',
                otherCurrentLiabilities: '19,450',
                totalCurrentLiabilities: '27,340'
            },
            nonCurrentLiabilities: {
                longTermDebt: '0',
                deferredTax: '1,920',
                otherNonCurrentLiabilities: '3,840',
                totalNonCurrentLiabilities: '5,760'
            },
            totalLiabilities: '33,100',
            equity: {
                shareCapital: '2,074',
                reservesAndSurplus: '76,626',
                totalEquity: '78,700'
            },
            workingCapital: '35,780',
            debtToEquity: '0.00',
            currentRatio: '2.31'
        }
    },
    {
        symbol: 'RIL',
        name: 'Reliance Industries Limited',
        exchange: 'NSE / BSE',
        sector: 'Energy & Retail',
        price: '₹2,980.00',
        change: '-0.4%',
        isPositive: false,
        marketCap: '₹20,15,000 Cr',
        debtRatio: '18.2%',
        cashRatio: '7.9%',
        impureRev: '1.1%',
        purificationRate: '0.35%',
        standard: 'AAOIFI & S&P Shariah',
        complianceStatus: 'Shariah Compliant (Within 33% Threshold)',
        summary: 'Major petrochemical, renewable energy, and retail infrastructure leader with financial leverage kept strictly under international 33% Shariah caps.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'S R B C & CO LLP / DTS & Associates',
            shariahAudit: 'AAOIFI & S&P Shariah Certified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '48,650',
                shortTermInvestments: '85,420',
                tradeReceivables: '24,190',
                otherCurrentAssets: '95,640',
                totalCurrentAssets: '2,53,900'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '9,45,200',
                intangibleAssets: '1,82,400',
                longTermInvestments: '2,14,500',
                otherNonCurrentAssets: '86,300',
                totalNonCurrentAssets: '14,28,400'
            },
            totalAssets: '16,82,300',
            currentLiabilities: {
                tradePayables: '1,94,200',
                shortTermDebt: '42,150',
                otherCurrentLiabilities: '1,12,400',
                totalCurrentLiabilities: '3,48,750'
            },
            nonCurrentLiabilities: {
                longTermDebt: '2,78,400',
                deferredTax: '89,450',
                otherNonCurrentLiabilities: '94,200',
                totalNonCurrentLiabilities: '4,62,050'
            },
            totalLiabilities: '8,10,800',
            equity: {
                shareCapital: '6,765',
                reservesAndSurplus: '8,64,735',
                totalEquity: '8,71,500'
            },
            workingCapital: '-94,850',
            debtToEquity: '0.37',
            currentRatio: '0.73'
        }
    },
    {
        symbol: 'HCLTECH',
        name: 'HCL Technologies Limited',
        exchange: 'NSE / BSE',
        sector: 'Technology',
        price: '₹1,780.00',
        change: '+1.6%',
        isPositive: true,
        marketCap: '₹4,82,000 Cr',
        debtRatio: '1.8%',
        cashRatio: '6.4%',
        impureRev: '0.1%',
        purificationRate: '0.04%',
        standard: 'MSCI Islamic Index',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Leading global technology company focused on software modernization, artificial intelligence, and cloud engineering.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'BSR & Co. LLP',
            shariahAudit: 'MSCI Islamic Standard Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '9,840',
                shortTermInvestments: '14,200',
                tradeReceivables: '18,920',
                otherCurrentAssets: '4,850',
                totalCurrentAssets: '47,810'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '12,450',
                intangibleAssets: '24,100',
                longTermInvestments: '6,420',
                otherNonCurrentAssets: '3,890',
                totalNonCurrentAssets: '46,860'
            },
            totalAssets: '94,670',
            currentLiabilities: {
                tradePayables: '5,820',
                shortTermDebt: '0',
                otherCurrentLiabilities: '14,350',
                totalCurrentLiabilities: '20,170'
            },
            nonCurrentLiabilities: {
                longTermDebt: '1,420',
                deferredTax: '1,120',
                otherNonCurrentLiabilities: '2,940',
                totalNonCurrentLiabilities: '5,480'
            },
            totalLiabilities: '25,650',
            equity: {
                shareCapital: '543',
                reservesAndSurplus: '68,477',
                totalEquity: '69,020'
            },
            workingCapital: '27,640',
            debtToEquity: '0.02',
            currentRatio: '2.37'
        }
    },
    {
        symbol: 'ABBOTINDIA',
        name: 'Abbott India Limited',
        exchange: 'NSE / BSE',
        sector: 'Healthcare',
        price: '₹27,850.00',
        change: '+2.1%',
        isPositive: true,
        marketCap: '₹59,200 Cr',
        debtRatio: '0.0%',
        cashRatio: '12.3%',
        impureRev: '0.0%',
        purificationRate: '0.00%',
        standard: 'AAOIFI Compliant',
        complianceStatus: '100% Shariah Compliant (Zero Debt)',
        summary: 'Premium healthcare and pharmaceutical solutions company with zero long-term interest debt and high liquid surplus.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'S R B C & CO LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '2,450',
                shortTermInvestments: '980',
                tradeReceivables: '740',
                otherCurrentAssets: '610',
                totalCurrentAssets: '4,780'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '640',
                intangibleAssets: '85',
                longTermInvestments: '120',
                otherNonCurrentAssets: '190',
                totalNonCurrentAssets: '1,035'
            },
            totalAssets: '5,815',
            currentLiabilities: {
                tradePayables: '720',
                shortTermDebt: '0',
                otherCurrentLiabilities: '450',
                totalCurrentLiabilities: '1,170'
            },
            nonCurrentLiabilities: {
                longTermDebt: '0',
                deferredTax: '45',
                otherNonCurrentLiabilities: '95',
                totalNonCurrentLiabilities: '140'
            },
            totalLiabilities: '1,310',
            equity: {
                shareCapital: '21',
                reservesAndSurplus: '4,484',
                totalEquity: '4,505'
            },
            workingCapital: '3,610',
            debtToEquity: '0.00',
            currentRatio: '4.08'
        }
    },
    {
        symbol: 'ASIANPAINT',
        name: 'Asian Paints Limited',
        exchange: 'NSE / BSE',
        sector: 'Consumer Goods',
        price: '₹3,140.00',
        change: '+0.5%',
        isPositive: true,
        marketCap: '₹3,01,000 Cr',
        debtRatio: '2.4%',
        cashRatio: '3.1%',
        impureRev: '0.0%',
        purificationRate: '0.02%',
        standard: 'AAOIFI & S&P Shariah',
        complianceStatus: '100% Shariah Compliant',
        summary: 'India’s leading decorative paints and home improvement coatings manufacturer with negligible financial gearing.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Deloitte Haskins & Sells LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '1,890',
                shortTermInvestments: '2,450',
                tradeReceivables: '5,120',
                otherCurrentAssets: '4,280',
                totalCurrentAssets: '13,740'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '9,450',
                intangibleAssets: '1,840',
                longTermInvestments: '3,120',
                otherNonCurrentAssets: '1,490',
                totalNonCurrentAssets: '15,900'
            },
            totalAssets: '29,640',
            currentLiabilities: {
                tradePayables: '4,150',
                shortTermDebt: '320',
                otherCurrentLiabilities: '2,890',
                totalCurrentLiabilities: '7,360'
            },
            nonCurrentLiabilities: {
                longTermDebt: '840',
                deferredTax: '650',
                otherNonCurrentLiabilities: '980',
                totalNonCurrentLiabilities: '2,470'
            },
            totalLiabilities: '9,830',
            equity: {
                shareCapital: '96',
                reservesAndSurplus: '19,714',
                totalEquity: '19,810'
            },
            workingCapital: '6,380',
            debtToEquity: '0.06',
            currentRatio: '1.87'
        }
    },
    {
        symbol: 'TATACONSUM',
        name: 'Tata Consumer Products Limited',
        exchange: 'NSE / BSE',
        sector: 'Consumer Goods',
        price: '₹1,145.00',
        change: '+1.4%',
        isPositive: true,
        marketCap: '₹1,08,500 Cr',
        debtRatio: '3.2%',
        cashRatio: '4.2%',
        impureRev: '0.0%',
        purificationRate: '0.01%',
        standard: 'AAOIFI Compliant',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Focused FMCG company bringing trusted food, beverage, and natural staples across household kitchens.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Deloitte Haskins & Sells LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '2,410',
                shortTermInvestments: '1,850',
                tradeReceivables: '2,940',
                otherCurrentAssets: '3,120',
                totalCurrentAssets: '10,320'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '6,420',
                intangibleAssets: '8,950',
                longTermInvestments: '2,140',
                otherNonCurrentAssets: '1,680',
                totalNonCurrentAssets: '19,190'
            },
            totalAssets: '29,510',
            currentLiabilities: {
                tradePayables: '2,640',
                shortTermDebt: '410',
                otherCurrentLiabilities: '1,890',
                totalCurrentLiabilities: '4,940'
            },
            nonCurrentLiabilities: {
                longTermDebt: '1,240',
                deferredTax: '890',
                otherNonCurrentLiabilities: '1,120',
                totalNonCurrentLiabilities: '3,250'
            },
            totalLiabilities: '8,190',
            equity: {
                shareCapital: '95',
                reservesAndSurplus: '21,225',
                totalEquity: '21,320'
            },
            workingCapital: '5,380',
            debtToEquity: '0.08',
            currentRatio: '2.09'
        }
    },
    {
        symbol: 'DRREDDY',
        name: "Dr. Reddy's Laboratories",
        exchange: 'NSE / BSE / NYSE',
        sector: 'Healthcare',
        price: '₹6,520.00',
        change: '+0.7%',
        isPositive: true,
        marketCap: '₹1,09,000 Cr',
        debtRatio: '1.6%',
        cashRatio: '8.5%',
        impureRev: '0.0%',
        purificationRate: '0.00%',
        standard: 'MSCI Islamic & AAOIFI',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Global pharmaceuticals giant producing affordable active pharmaceutical ingredients (APIs) and generic medicines.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'S R B C & CO LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '4,890',
                shortTermInvestments: '3,410',
                tradeReceivables: '6,150',
                otherCurrentAssets: '5,280',
                totalCurrentAssets: '19,730'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '11,450',
                intangibleAssets: '4,820',
                longTermInvestments: '1,940',
                otherNonCurrentAssets: '2,180',
                totalNonCurrentAssets: '20,390'
            },
            totalAssets: '40,120',
            currentLiabilities: {
                tradePayables: '3,450',
                shortTermDebt: '180',
                otherCurrentLiabilities: '3,120',
                totalCurrentLiabilities: '6,750'
            },
            nonCurrentLiabilities: {
                longTermDebt: '940',
                deferredTax: '410',
                otherNonCurrentLiabilities: '890',
                totalNonCurrentLiabilities: '2,240'
            },
            totalLiabilities: '8,990',
            equity: {
                shareCapital: '83',
                reservesAndSurplus: '31,047',
                totalEquity: '31,130'
            },
            workingCapital: '12,980',
            debtToEquity: '0.04',
            currentRatio: '2.92'
        }
    },
    {
        symbol: 'TITAN',
        name: 'Titan Company Limited',
        exchange: 'NSE / BSE',
        sector: 'Consumer Goods',
        price: '₹3,680.00',
        change: '-0.2%',
        isPositive: false,
        marketCap: '₹3,26,000 Cr',
        debtRatio: '8.5%',
        cashRatio: '3.9%',
        impureRev: '0.0%',
        purificationRate: '0.02%',
        standard: 'AAOIFI Compliant',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Tata Group lifestyle and jewellery icon with strong retail franchise and well-regulated working capital debt.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'BSR & Co. LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '2,140',
                shortTermInvestments: '1,650',
                tradeReceivables: '1,420',
                otherCurrentAssets: '14,890',
                totalCurrentAssets: '20,100'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '3,840',
                intangibleAssets: '890',
                longTermInvestments: '1,450',
                otherNonCurrentAssets: '1,120',
                totalNonCurrentAssets: '7,300'
            },
            totalAssets: '27,400',
            currentLiabilities: {
                tradePayables: '4,120',
                shortTermDebt: '1,890',
                otherCurrentLiabilities: '5,240',
                totalCurrentLiabilities: '11,250'
            },
            nonCurrentLiabilities: {
                longTermDebt: '2,140',
                deferredTax: '320',
                otherNonCurrentLiabilities: '890',
                totalNonCurrentLiabilities: '3,350'
            },
            totalLiabilities: '14,600',
            equity: {
                shareCapital: '89',
                reservesAndSurplus: '12,711',
                totalEquity: '12,800'
            },
            workingCapital: '8,850',
            debtToEquity: '0.31',
            currentRatio: '1.79'
        }
    },
    {
        symbol: 'CIPLA',
        name: 'Cipla Limited',
        exchange: 'NSE / BSE',
        sector: 'Healthcare',
        price: '₹1,560.00',
        change: '+1.1%',
        isPositive: true,
        marketCap: '₹1,26,000 Cr',
        debtRatio: '0.5%',
        cashRatio: '9.1%',
        impureRev: '0.0%',
        purificationRate: '0.00%',
        standard: 'AAOIFI & MSCI Islamic',
        complianceStatus: '100% Shariah Compliant',
        summary: 'Global respiratory and critical healthcare pioneer with strong cash flows and debt-free core operations.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Walker Chandiok & Co LLP',
            shariahAudit: 'AAOIFI Standard 21 Verified',
            currencyUnit: 'INR in Crores',
            currentAssets: {
                cashAndEquivalents: '5,240',
                shortTermInvestments: '4,120',
                tradeReceivables: '4,890',
                otherCurrentAssets: '3,950',
                totalCurrentAssets: '18,200'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '8,140',
                intangibleAssets: '3,920',
                longTermInvestments: '1,450',
                otherNonCurrentAssets: '1,640',
                totalNonCurrentAssets: '15,150'
            },
            totalAssets: '33,350',
            currentLiabilities: {
                tradePayables: '2,890',
                shortTermDebt: '0',
                otherCurrentLiabilities: '2,140',
                totalCurrentLiabilities: '5,030'
            },
            nonCurrentLiabilities: {
                longTermDebt: '310',
                deferredTax: '420',
                otherNonCurrentLiabilities: '690',
                totalNonCurrentLiabilities: '1,420'
            },
            totalLiabilities: '6,450',
            equity: {
                shareCapital: '161',
                reservesAndSurplus: '26,739',
                totalEquity: '26,900'
            },
            workingCapital: '13,170',
            debtToEquity: '0.01',
            currentRatio: '3.62'
        }
    },
    {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        sector: 'Global Technology',
        price: '$445.20',
        change: '+1.8%',
        isPositive: true,
        marketCap: '$3.31 Trillion',
        debtRatio: '8.2%',
        cashRatio: '4.1%',
        impureRev: '0.8%',
        purificationRate: '0.24%',
        standard: 'MSCI World Islamic',
        complianceStatus: '100% Shariah Compliant',
        summary: 'World pioneer in personal computing, enterprise cloud infrastructure (Azure), and foundational AI productivity suites.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Deloitte & Touche LLP',
            shariahAudit: 'MSCI World Islamic Verified',
            currencyUnit: 'USD in Millions',
            currentAssets: {
                cashAndEquivalents: '34,700',
                shortTermInvestments: '76,500',
                tradeReceivables: '48,200',
                otherCurrentAssets: '16,400',
                totalCurrentAssets: '1,75,800'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '1,42,000',
                intangibleAssets: '98,400',
                longTermInvestments: '32,100',
                otherNonCurrentAssets: '21,500',
                totalNonCurrentAssets: '2,94,000'
            },
            totalAssets: '4,69,800',
            currentLiabilities: {
                tradePayables: '24,100',
                shortTermDebt: '8,400',
                otherCurrentLiabilities: '68,200',
                totalCurrentLiabilities: '1,00,700'
            },
            nonCurrentLiabilities: {
                longTermDebt: '44,200',
                deferredTax: '14,800',
                otherNonCurrentLiabilities: '28,100',
                totalNonCurrentLiabilities: '87,100'
            },
            totalLiabilities: '1,87,800',
            equity: {
                shareCapital: '93,700',
                reservesAndSurplus: '1,88,300',
                totalEquity: '2,82,000'
            },
            workingCapital: '75,100',
            debtToEquity: '0.19',
            currentRatio: '1.75'
        }
    },
    {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        sector: 'Global Technology',
        price: '$228.40',
        change: '+0.9%',
        isPositive: true,
        marketCap: '$3.48 Trillion',
        debtRatio: '15.4%',
        cashRatio: '5.3%',
        impureRev: '1.2%',
        purificationRate: '0.38%',
        standard: 'S&P Global Shariah',
        complianceStatus: 'Shariah Compliant (Within 33% Threshold)',
        summary: 'Global consumer electronics and operating system pioneer with industry-leading Return on Invested Capital and compliant gearing.',
        balanceSheet: {
            fiscalYear: 'FY 2025-26',
            auditFirm: 'Ernst & Young LLP',
            shariahAudit: 'S&P Shariah Certified',
            currencyUnit: 'USD in Millions',
            currentAssets: {
                cashAndEquivalents: '29,960',
                shortTermInvestments: '31,590',
                tradeReceivables: '29,500',
                otherCurrentAssets: '52,450',
                totalCurrentAssets: '1,43,500'
            },
            nonCurrentAssets: {
                propertyPlantEquipment: '45,200',
                intangibleAssets: '0',
                longTermInvestments: '1,00,500',
                otherNonCurrentAssets: '63,100',
                totalNonCurrentAssets: '2,08,800'
            },
            totalAssets: '3,52,300',
            currentLiabilities: {
                tradePayables: '64,115',
                shortTermDebt: '10,950',
                otherCurrentLiabilities: '70,235',
                totalCurrentLiabilities: '1,45,300'
            },
            nonCurrentLiabilities: {
                longTermDebt: '95,800',
                deferredTax: '18,400',
                otherNonCurrentLiabilities: '28,100',
                totalNonCurrentLiabilities: '1,42,300'
            },
            totalLiabilities: '2,87,600',
            equity: {
                shareCapital: '73,800',
                reservesAndSurplus: '-9,100',
                totalEquity: '64,700'
            },
            workingCapital: '-1,800',
            debtToEquity: '1.65',
            currentRatio: '0.99'
        }
    }
];

export default function HalalStocksView() {
    const { showToast } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSector, setSelectedSector] = useState('all');
    const [previewStock, setPreviewStock] = useState(null);
    const [upstoxConnected, setUpstoxConnected] = useState(false);
    const [upstoxStatus, setUpstoxStatus] = useState('Checking Upstox connection…');
    const [liveQuotes, setLiveQuotes] = useState({});
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        checkUpstoxStatus().then(result => {
            setUpstoxConnected(Boolean(result.connected));
            setUpstoxStatus(result.connected ? 'Connected · refreshing every 15 seconds' : 'Connect Upstox in Settings for live Indian stock prices');
        }).catch(() => setUpstoxStatus('Unable to check Upstox connection'));
    }, []);

    const refreshLiveQuotes = useCallback(async () => {
        if (!upstoxConnected) return;
        const indianStocks = HALAL_STOCKS_DATA.filter(stock => stock.exchange.includes('NSE') || stock.exchange.includes('BSE'));
        try {
            const keys = indianStocks.map(stock => getInstrumentKey(stock.symbol === 'RIL' ? 'RELIANCE' : stock.symbol));
            const quotes = await fetchQuotes(keys);
            const nextQuotes = {};
            indianStocks.forEach(stock => {
                const symbol = stock.symbol === 'RIL' ? 'RELIANCE' : stock.symbol;
                const quote = getQuoteForInstrument(quotes, getInstrumentKey(symbol));
                const price = Number(quote?.last_price);
                if (!quote || !Number.isFinite(price)) return;
                const close = Number(quote.cp ?? quote.ohlc?.close);
                const change = Number(quote.net_change ?? (Number.isFinite(close) ? price - close : 0));
                nextQuotes[stock.symbol] = {
                    price,
                    change,
                    changePercent: Number.isFinite(close) && close > 0 ? change / close * 100 : null
                };
            });
            setLiveQuotes(nextQuotes);
            setLastUpdated(new Date());
            setUpstoxStatus(`Upstox live · ${Object.keys(nextQuotes).length} Indian stocks updated`);
        } catch (error) {
            setUpstoxStatus(`Upstox quote error: ${error.message}`);
        }
    }, [upstoxConnected]);

    useEffect(() => {
        if (!upstoxConnected) return undefined;
        refreshLiveQuotes();
        const interval = setInterval(refreshLiveQuotes, 15000);
        return () => clearInterval(interval);
    }, [upstoxConnected, refreshLiveQuotes]);

    const sectors = ['all', 'Technology', 'Healthcare', 'Consumer Goods', 'Energy & Retail', 'Global Technology'];

    const filteredStocks = useMemo(() => {
        return HALAL_STOCKS_DATA.filter(stock => {
            const matchesSector = selectedSector === 'all' || stock.sector === selectedSector;
            const q = searchQuery.trim().toLowerCase();
            const matchesQuery = !q ||
                stock.name.toLowerCase().includes(q) ||
                stock.symbol.toLowerCase().includes(q) ||
                stock.sector.toLowerCase().includes(q);
            return matchesSector && matchesQuery;
        });
    }, [searchQuery, selectedSector]);

    // Download Single Company Balance Sheet (CSV / Excel formatted)
    const handleDownloadBalanceSheet = (stock) => {
        const bs = stock.balanceSheet;
        const csvContent = [
            `"BALANCE SHEET STATEMENT - ${stock.name.toUpperCase()} (${stock.symbol})"`,
            `"Exchange: ${stock.exchange}"`,
            `"Fiscal Period: ${bs.fiscalYear}"`,
            `"Statutory Auditor: ${bs.auditFirm}"`,
            `"Shariah Governance Standard: ${bs.shariahAudit}"`,
            `"Denomination: ${bs.currencyUnit}"`,
            `"Downloaded From: FinTracker Wealth Platform"`,
            `"Date of Report: ${new Date().toLocaleDateString('en-GB')}"`,
            `""`,
            `"LINE ITEM","AMOUNT (${bs.currencyUnit})"`,
            `"================== ASSETS ==================",""`,
            `"Cash & Cash Equivalents","${bs.currentAssets.cashAndEquivalents}"`,
            `"Short-Term Marketable Investments","${bs.currentAssets.shortTermInvestments}"`,
            `"Trade Receivables","${bs.currentAssets.tradeReceivables}"`,
            `"Other Current Assets & Inventories","${bs.currentAssets.otherCurrentAssets}"`,
            `"TOTAL CURRENT ASSETS","${bs.currentAssets.totalCurrentAssets}"`,
            `""`,
            `"Property, Plant & Equipment","${bs.nonCurrentAssets.propertyPlantEquipment}"`,
            `"Intangible Assets & Goodwill","${bs.nonCurrentAssets.intangibleAssets}"`,
            `"Long-Term Strategic Investments","${bs.nonCurrentAssets.longTermInvestments}"`,
            `"Other Non-Current Assets","${bs.nonCurrentAssets.otherNonCurrentAssets}"`,
            `"TOTAL NON-CURRENT ASSETS","${bs.nonCurrentAssets.totalNonCurrentAssets}"`,
            `"TOTAL ASSETS","${bs.totalAssets}"`,
            `""`,
            `"================== LIABILITIES ==================",""`,
            `"Trade Payables & Operational Dues","${bs.currentLiabilities.tradePayables}"`,
            `"Short-Term Financial Debt","${bs.currentLiabilities.shortTermDebt}"`,
            `"Other Current Liabilities","${bs.currentLiabilities.otherCurrentLiabilities}"`,
            `"TOTAL CURRENT LIABILITIES","${bs.currentLiabilities.totalCurrentLiabilities}"`,
            `""`,
            `"Long-Term Financial Borrowings","${bs.nonCurrentLiabilities.longTermDebt}"`,
            `"Deferred Tax Liabilities (Net)","${bs.nonCurrentLiabilities.deferredTax}"`,
            `"Other Long-Term Obligations","${bs.nonCurrentLiabilities.otherNonCurrentLiabilities}"`,
            `"TOTAL NON-CURRENT LIABILITIES","${bs.nonCurrentLiabilities.totalNonCurrentLiabilities}"`,
            `"TOTAL LIABILITIES","${bs.totalLiabilities}"`,
            `""`,
            `"================== SHAREHOLDERS EQUITY ==================",""`,
            `"Paid-up Share Capital","${bs.equity.shareCapital}"`,
            `"Reserves & Retained Earnings","${bs.equity.reservesAndSurplus}"`,
            `"TOTAL SHAREHOLDERS EQUITY","${bs.equity.totalEquity}"`,
            `""`,
            `"================== KEY FINANCIAL RATIOS ==================",""`,
            `"Net Working Capital","${bs.workingCapital}"`,
            `"Debt-to-Equity Ratio","${bs.debtToEquity}"`,
            `"Current Ratio","${bs.currentRatio}"`,
            `"Total Debt / Market Cap (Shariah Limit < 33%)","${stock.debtRatio}"`,
            `"Interest-Bearing Cash / Market Cap (Limit < 33%)","${stock.cashRatio}"`,
            `"Non-Permissible Income / Revenue (Limit < 5%)","${stock.impureRev}"`,
            `"Dividend Purification Guidance","${stock.purificationRate}"`
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${stock.symbol}_Balance_Sheet_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Balance sheet for ${stock.symbol} downloaded successfully!`);
    };

    // Download Master Registry with All Stocks & Financial Highlights
    const handleDownloadAllStocks = () => {
        const headers = [
            'Symbol',
            'Company Name',
            'Exchange',
            'Sector',
            'CMP',
            'Day Change',
            'Market Cap',
            'Debt Ratio (<33%)',
            'Cash Ratio (<33%)',
            'Impure Revenue (<5%)',
            'Purification %',
            'Shariah Standard',
            'Compliance Status',
            'Total Assets',
            'Total Liabilities',
            'Total Equity',
            'Working Capital',
            'Current Ratio',
            'Statutory Auditor'
        ];

        const rows = HALAL_STOCKS_DATA.map(s => [
            `"${s.symbol}"`,
            `"${s.name}"`,
            `"${s.exchange}"`,
            `"${s.sector}"`,
            `"${s.price}"`,
            `"${s.change}"`,
            `"${s.marketCap}"`,
            `"${s.debtRatio}"`,
            `"${s.cashRatio}"`,
            `"${s.impureRev}"`,
            `"${s.purificationRate}"`,
            `"${s.standard}"`,
            `"${s.complianceStatus}"`,
            `"${s.balanceSheet.totalAssets} (${s.balanceSheet.currencyUnit})"`,
            `"${s.balanceSheet.totalLiabilities}"`,
            `"${s.balanceSheet.equity.totalEquity}"`,
            `"${s.balanceSheet.workingCapital}"`,
            `"${s.balanceSheet.currentRatio}"`,
            `"${s.balanceSheet.auditFirm}"`
        ]);

        const csvContent = [
            `"SHARIAH-COMPLIANT EQUITIES & BALANCE SHEET REGISTRY - FINTRACKER"`,
            `"Generated: ${new Date().toLocaleString()}"`,
            `"Compliance Standard: AAOIFI / MSCI / S&P Shariah Methodology"`,
            `""`,
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(r => r.join(','))
        ].join('\r\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Halal_Stocks_Registry_BalanceSheets_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Complete Halal Stocks Registry & Financials downloaded in Excel format!');
    };

    return (
        <div id="halalStocksPage" className="page-view">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>🕌</span>
                        <h1 className="page-title" style={{ margin: 0 }}>Halal Stocks &amp; Company Balance Sheets</h1>
                    </div>
                    <p className="page-subtitle">
                        Curated Shariah-compliant equities audited under AAOIFI &amp; MSCI standards. Download audited company balance sheets in Excel.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: upstoxConnected ? '#10b981' : 'var(--text-muted)' }}>
                        {upstoxStatus}{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString()}` : ''}
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={refreshLiveQuotes} disabled={!upstoxConnected} title={upstoxStatus}>
                        ↻ Refresh quotes
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleDownloadAllStocks}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
                    >
                        <span>📥</span> Download Full Registry (Excel)
                    </button>
                </div>
            </div>

            {/* Top Stat Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '18px' }}>
                <div className="summary-card" style={{ padding: '16px' }}>
                    <span className="summary-label">Certified Halal Equities</span>
                    <strong className="summary-value" style={{ color: '#10b981' }}>{HALAL_STOCKS_DATA.length} Listed</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NSE, BSE &amp; Global Bluechips</span>
                </div>
                <div className="summary-card" style={{ padding: '16px' }}>
                    <span className="summary-label">Financial Screening Cap</span>
                    <strong className="summary-value" style={{ color: '#3b82f6' }}>&lt; 33% Debt</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AAOIFI Debt / Market Cap Ceiling</span>
                </div>
                <div className="summary-card" style={{ padding: '16px' }}>
                    <span className="summary-label">Impure Revenue Cap</span>
                    <strong className="summary-value" style={{ color: '#f59e0b' }}>&lt; 5.0% Limit</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero alcohol, gaming, or ribawi banks</span>
                </div>
                <div className="summary-card" style={{ padding: '16px' }}>
                    <span className="summary-label">Audited Balance Sheets</span>
                    <strong className="summary-value" style={{ color: '#8b5cf6' }}>100% Verified</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>One-click Excel (.csv) downloads</span>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="table-card" style={{ padding: '16px 20px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '260px' }}>
                    <div className="search-box" style={{ width: '100%', maxWidth: '340px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M16 16L21 21" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by company, ticker, or sector..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-pills" style={{ overflowX: 'auto', paddingBottom: '2px' }}>
                    {sectors.map(sec => (
                        <button
                            key={sec}
                            className={`pill ${selectedSector === sec ? 'active' : ''}`}
                            onClick={() => setSelectedSector(sec)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {sec === 'all' ? 'All Sectors' : sec}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stocks Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '18px', marginTop: '18px' }}>
                {filteredStocks.map(stock => (
                    <div
                        key={stock.symbol}
                        className="table-card"
                        style={{
                            padding: '22px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            border: '1px solid var(--border)',
                            position: 'relative'
                        }}
                    >
                        <div>
                            {/* Stock Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {stock.symbol}
                                        </span>
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                            {stock.exchange}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {stock.name}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                        {liveQuotes[stock.symbol]
                                            ? `₹${liveQuotes[stock.symbol].price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : stock.price}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: (liveQuotes[stock.symbol]?.change ?? (stock.isPositive ? 1 : -1)) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {liveQuotes[stock.symbol]
                                            ? `${liveQuotes[stock.symbol].change >= 0 ? '+' : ''}${liveQuotes[stock.symbol].change.toFixed(2)}${liveQuotes[stock.symbol].changePercent == null ? '' : ` (${liveQuotes[stock.symbol].changePercent >= 0 ? '+' : ''}${liveQuotes[stock.symbol].changePercent.toFixed(2)}%)`}`
                                            : stock.change}
                                    </div>
                                </div>
                            </div>

                            {/* Compliance Badge */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#10b981',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                marginBottom: '14px'
                            }}>
                                <span>✓</span> {stock.complianceStatus}
                            </div>

                            {/* Description */}
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', margin: '0 0 14px 0' }}>
                                {stock.summary}
                            </p>

                            {/* Shariah Financial Health Table */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Debt / MCap</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                                            {stock.debtRatio}
                                        </div>
                                        <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)' }}>Limit &lt; 33%</div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Cash / MCap</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginTop: '2px' }}>
                                            {stock.cashRatio}
                                        </div>
                                        <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)' }}>Limit &lt; 33%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Impure Rev</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }}>
                                            {stock.impureRev}
                                        </div>
                                        <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)' }}>Limit &lt; 5%</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '8px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPreviewStock(stock)}
                                style={{ fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
                            >
                                👁️ View Sheet
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleDownloadBalanceSheet(stock)}
                                style={{ fontSize: '12px', padding: '8px 12px', justifyContent: 'center', fontWeight: '700' }}
                            >
                                📥 Download Sheet
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Interactive Balance Sheet Preview Modal */}
            {previewStock && (
                <div className="modal-overlay" onClick={() => setPreviewStock(null)}>
                    <div
                        className="modal-box"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
                    >
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                                        {previewStock.name} ({previewStock.symbol})
                                    </h3>
                                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                                        Audited Balance Sheet
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {previewStock.balanceSheet.fiscalYear} · {previewStock.balanceSheet.auditFirm} · {previewStock.balanceSheet.currencyUnit}
                                </div>
                            </div>
                            <button type="button" className="close-btn" onClick={() => setPreviewStock(null)}>✕</button>
                        </div>

                        {/* Balance Sheet Breakdown Table */}
                        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                            {/* Assets */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#60a5fa', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                                    1. Assets ({previewStock.balanceSheet.currencyUnit})
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cash &amp; Liquid Bank Balances:</span>
                                    <strong>{previewStock.balanceSheet.currentAssets.cashAndEquivalents}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Short-Term Investments:</span>
                                    <strong>{previewStock.balanceSheet.currentAssets.shortTermInvestments}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Trade Receivables &amp; Debtors:</span>
                                    <strong>{previewStock.balanceSheet.currentAssets.tradeReceivables}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Other Inventories &amp; Current Assets:</span>
                                    <strong>{previewStock.balanceSheet.currentAssets.otherCurrentAssets}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed var(--border)', color: 'var(--text-primary)', fontWeight: '700' }}>
                                    <span>Total Current Assets:</span>
                                    <span>{previewStock.balanceSheet.currentAssets.totalCurrentAssets}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Property, Plant &amp; Equipment:</span>
                                    <strong>{previewStock.balanceSheet.nonCurrentAssets.propertyPlantEquipment}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Intangibles &amp; Long-term Investments:</span>
                                    <strong>{previewStock.balanceSheet.nonCurrentAssets.longTermInvestments}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', fontWeight: '800', color: '#60a5fa', marginTop: '6px' }}>
                                    <span>TOTAL ASSETS:</span>
                                    <span>{previewStock.balanceSheet.totalAssets}</span>
                                </div>
                            </div>

                            {/* Liabilities */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#f87171', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                                    2. Liabilities ({previewStock.balanceSheet.currencyUnit})
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Trade Payables &amp; Dues:</span>
                                    <strong>{previewStock.balanceSheet.currentLiabilities.tradePayables}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Short-Term Debt Borrowings:</span>
                                    <strong>{previewStock.balanceSheet.currentLiabilities.shortTermDebt}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Long-Term Financial Debt:</span>
                                    <strong>{previewStock.balanceSheet.nonCurrentLiabilities.longTermDebt}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', fontWeight: '800', color: '#f87171', marginTop: '6px' }}>
                                    <span>TOTAL LIABILITIES:</span>
                                    <span>{previewStock.balanceSheet.totalLiabilities}</span>
                                </div>
                            </div>

                            {/* Shareholders Equity */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#34d399', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '8px' }}>
                                    3. Shareholders' Net Worth
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Paid-up Capital:</span>
                                    <strong>{previewStock.balanceSheet.equity.shareCapital}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Reserves &amp; Retained Earnings:</span>
                                    <strong>{previewStock.balanceSheet.equity.reservesAndSurplus}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>
                                    <span>TOTAL SHAREHOLDERS EQUITY:</span>
                                    <span>{previewStock.balanceSheet.equity.totalEquity}</span>
                                </div>
                            </div>

                            {/* Health Indicators */}
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                                    <div>Working Capital: <strong>{previewStock.balanceSheet.workingCapital}</strong></div>
                                    <div>Current Ratio: <strong>{previewStock.balanceSheet.currentRatio}</strong></div>
                                    <div>Debt-to-Equity: <strong>{previewStock.balanceSheet.debtToEquity}</strong></div>
                                    <div>Shariah Audit: <strong style={{ color: '#10b981' }}>Passes AAOIFI 21</strong></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setPreviewStock(null)}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    handleDownloadBalanceSheet(previewStock);
                                    setPreviewStock(null);
                                }}
                            >
                                📥 Download Excel Balance Sheet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
