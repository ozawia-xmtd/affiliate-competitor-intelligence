const statusCopy = {
  clear: 'Japan clear',
  partial: 'Japan partial',
  open: 'Japan unresolved',
  claim: 'Claim'
};

export function getStatusLabel(status) {
  return statusCopy[status] || status || 'Unknown';
}

export function deriveAnalysis(analysis, sourceRegister, sourceGaps) {
  const sourceById = new Map(sourceRegister.map(record => [record['Source ID'], record]));
  const competitors = analysis.competitors.map(competitor => ({
    ...competitor,
    sourceRecords: competitor.sources.map(id => sourceById.get(id)).filter(Boolean),
    sourceCount: competitor.sources.length,
    evidenceState: competitor.japanStatus === 'clear' ? 'verified' : competitor.japanStatus === 'partial' ? 'partial' : 'open'
  }));
  const openGaps = sourceGaps.filter(gap => String(gap.Status).toLowerCase() !== 'closed');
  const classified = sourceRegister.reduce((acc, record) => {
    const reliability = record.Reliability || 'Unclassified';
    acc[reliability] = (acc[reliability] || 0) + 1;
    return acc;
  }, {});
  return {
    ...analysis,
    competitors,
    derived: {
      brandsInScope: competitors.length,
      sourceRecords: sourceRegister.length,
      openGaps: openGaps.length,
      primaryRecords: classified.Primary || 0,
      reliabilityBreakdown: classified,
      sourceById,
      openGaps
    }
  };
}

function findCompetitor(query, competitors) {
  const text = query.toLowerCase();
  return competitors.find(competitor => [competitor.id, competitor.label, competitor.short].some(value => text.includes(String(value).toLowerCase())));
}

export function answerQuestion(query, analysis) {
  const text = query.trim().toLowerCase();
  const competitor = findCompetitor(text, analysis.competitors);
  if (competitor && /cashback|rebate|client|pass.?through/.test(text)) {
    return {
      answer: `${competitor.label}: ${competitor.rebate} This is classified as ${competitor.rebateStatus === 'clear' ? 'clear evidence' : competitor.rebateStatus === 'partial' ? 'partial evidence' : 'an open / not-found finding'}, not proof that the mechanism is unavailable.`,
      sources: competitor.sources
    };
  }
  if (competitor && /payout|pay|withdraw|payment|speed/.test(text)) {
    return { answer: `${competitor.label}: ${competitor.payout}`, sources: competitor.sources };
  }
  if (competitor && /rate|commission|economics|lot|spread|reward/.test(text)) {
    return { answer: `${competitor.label}: ${competitor.economics} Basis: ${competitor.basis}.`, sources: competitor.sources };
  }
  if (competitor && /japan|eligible|scope|entity/.test(text)) {
    return { answer: `${competitor.label}: ${competitor.japan} Open issue: ${competitor.gap}`, sources: competitor.sources };
  }
  if (/fast|payout|pay/.test(text)) {
    return {
      answer: 'On the reviewed evidence, Exness has the fastest documented partner-reward option: an instant reward may arrive within about 20 minutes, alongside daily payouts. Vantage documents next-day credit, HFM advertises daily payments, XS states same-day wallet payment, while XMTD pays weekly and has a USD 500 payment threshold. These flows are not identical, so this is an operational comparison rather than a legal ranking.',
      sources: ['EXN-011', 'VTD-002', 'HFM-003', 'XS-001', 'XMTD-002']
    };
  }
  if (/gap|missing|japan/.test(text)) {
    return {
      answer: `The current register contains ${analysis.derived.sourceRecords} records and ${analysis.derived.openGaps} open source gap(s). The most important unresolved issue is the Japan-specific XS affiliate agreement (GAP-001). HFM's Japan/entity applicability and Exness's entity-specific Japan agreement also need confirmation.`,
      sources: ['GAP-001', 'HFM-001', 'EXN-032']
    };
  }
  if (/calculator|test case|scenario/.test(text)) {
    return {
      answer: 'Suggested calculator scenarios: (1) Standard FX at low, medium and high partner tiers; (2) metals and indices where the basis changes; (3) partner reward with zero, partial and maximum client pass-through; (4) weekly versus daily payout and the USD 500 threshold; (5) excluded trades such as short holding time, bonus-funded or self-referral activity. Keep each output labelled with its source IDs and assumptions.',
      sources: ['XMTD-001', 'XMTD-002', 'EXN-008', 'EXN-027', 'VTD-002']
    };
  }
  return {
    answer: 'I can answer evidence-led questions about cashback, partner economics, payout timing, Japan applicability, restrictions, source coverage and open gaps. Name a competitor or ask “What is the current cashback offering of HFM?”',
    sources: []
  };
}
