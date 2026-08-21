import React, { useState } from 'react';
import digSitesData from '../data/jwe3_dig_sites.json';
import speciesData from '../data/jwe3_species.json';
import { calculateRequiredExpeditions } from '../utils/logicEngine';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export default function DigSites({ paddock, completedSites, toggleSiteCompletion, theme }) {
  const [viewMode, setViewMode] = useState('required'); 
  const t = theme || {
    bgMain: '#111827',
    bgCard: '#1f2937',
    bgSubCard: '#111827',
    border: '#374151',
    textMain: '#f3f4f6',
    textMuted: '#9ca3af',
    primary: '#14b8a6',
    accent: '#f59e0b',
  };

  const { sites: requiredSites, totalCost, totalDuration, maxLogistics } = 
    calculateRequiredExpeditions(paddock, completedSites);

  const groupedGlobalSites = digSitesData.reduce((acc, site) => {
    const region = site.region || 'Unknown';
    if (!acc[region]) acc[region] = [];
    acc[region].push(site);
    return acc;
  }, {});

  const renderSiteCard = (site) => {
    const isCompleted = completedSites[site.id];
    const isLocked = site.unlocks_after && !completedSites[site.unlocks_after];
    
    return (
      <div key={site.id} style={{
        background: t.bgCard, border: `1px solid ${isCompleted ? t.primary : t.border}`,
        borderRadius: '8px', padding: '16px', opacity: isLocked && !isCompleted ? 0.6 : 1
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: isCompleted ? t.primary : t.textMain, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {site.name}
              {isLocked && !isCompleted && <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>Locked</span>}
            </h3>
            <span style={{ fontSize: '12px', color: t.textMuted }}>{site.country} • {site.sub_location}</span>
          </div>
          <button
            onClick={() => toggleSiteCompletion(site.id)}
            style={{
              background: isCompleted ? `${t.primary}22` : t.border, color: isCompleted ? t.primary : t.textMain,
              border: `1px solid ${isCompleted ? t.primary : t.border}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
            }}
          >
            {isCompleted ? '✓ Completed' : 'Mark Complete'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: t.textMain, marginBottom: '12px', background: t.bgSubCard, padding: '10px', borderRadius: '6px' }}>
          <span>Cost: <b style={{ color: t.accent }}>${site.cost?.toLocaleString()}</b></span>
          <span>Time: <b style={{ color: '#38bdf8' }}>{formatTime(site.duration_seconds)}</b></span>
          <span>Logistics: <b style={{ color: '#ef4444' }}>{site.logistics}</b></span>
        </div>

        {site.unlocks_after && !isCompleted && (
          <div style={{ fontSize: '11px', color: t.accent, marginBottom: '12px' }}>
            Requires: <b>{digSitesData.find(s => s.id === site.unlocks_after)?.name || site.unlocks_after}</b>
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {site.species.map(spId => {
            const spName = speciesData.find(s => s.id === spId)?.name || spId;
            return (
              <span key={spId} style={{ background: t.border, color: t.textMain, fontSize: '11px', padding: '4px 8px', borderRadius: '4px' }}>
                {spName}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: t.textMain }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setViewMode('required')}
          style={{ flex: 1, padding: '12px', background: viewMode === 'required' ? t.primary : t.bgCard, color: viewMode === 'required' ? t.bgMain : t.primary, border: `1px solid ${viewMode === 'required' ? t.primary : t.border}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Active Paddock Targets
        </button>
        <button
          onClick={() => setViewMode('global')}
          style={{ flex: 1, padding: '12px', background: viewMode === 'global' ? t.primary : t.bgCard, color: viewMode === 'global' ? t.bgMain : t.primary, border: `1px solid ${viewMode === 'global' ? t.primary : t.border}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Global Map Directory
        </button>
      </div>

      {viewMode === 'required' && (
        <>
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 15px 0', color: t.textMain, fontSize: '18px' }}>Logistics Required</h2>
            {requiredSites.length === 0 ? (
              <p style={{ color: t.textMuted, margin: 0, fontSize: '14px' }}>No pending expeditions required for your current enclosure.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div><div style={{ fontSize: '12px', color: t.textMuted }}>Total Funds</div><div style={{ fontSize: '20px', color: t.accent, fontWeight: 'bold' }}>${totalCost.toLocaleString()}</div></div>
                <div><div style={{ fontSize: '12px', color: t.textMuted }}>Total Time</div><div style={{ fontSize: '20px', color: '#38bdf8', fontWeight: 'bold' }}>{formatTime(totalDuration)}</div></div>
                <div><div style={{ fontSize: '12px', color: t.textMuted }}>Max Logistics</div><div style={{ fontSize: '20px', color: '#ef4444', fontWeight: 'bold' }}>{maxLogistics}</div></div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {requiredSites.map(renderSiteCard)}
          </div>
        </>
      )}

      {viewMode === 'global' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {Object.entries(groupedGlobalSites).map(([region, sites]) => (
            <div key={region}>
              <h2 style={{ borderBottom: `2px solid ${t.border}`, paddingBottom: '10px', color: t.primary, marginTop: 0 }}>{region}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px', marginTop: '15px' }}>
                {sites.map(renderSiteCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}