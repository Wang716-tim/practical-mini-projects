const round = (value) => Math.round(value * 10) / 10;

/**
 * Compare alternatives without mistaking a calculated score for a proven answer.
 * Scores and evidence coverage are deliberately kept separate.
 */
export function evaluateDecision(criteria, options) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error('至少需要一个判断维度');
  }
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('至少需要一个备选方案');
  }
  if (new Set(criteria.map((item) => item.id)).size !== criteria.length) {
    throw new Error('判断维度 ID 不能重复');
  }

  for (const criterion of criteria) {
    if (!Number.isFinite(criterion.weight) || criterion.weight < 1 || criterion.weight > 5) {
      throw new Error('权重必须是 1 到 5 的数字');
    }
  }

  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  const ranked = options.map((option) => {
    let weightedScore = 0;
    let evidencedWeight = 0;

    for (const criterion of criteria) {
      const entry = option.scores?.[criterion.id];
      if (!entry || !Number.isFinite(entry.value) || entry.value < 0 || entry.value > 5) {
        throw new Error(`方案「${option.name}」的「${criterion.label || criterion.id}」分数必须在 0 到 5 之间`);
      }
      weightedScore += criterion.weight * entry.value;
      if (typeof entry.evidence === 'string' && entry.evidence.trim()) {
        evidencedWeight += criterion.weight;
      }
    }

    return {
      ...option,
      score: round(weightedScore / totalWeight),
      coverage: round(evidencedWeight / totalWeight),
    };
  }).sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.name.localeCompare(b.name));

  const leader = ranked[0];
  const margin = ranked.length > 1 ? round(leader.score - ranked[1].score) : 0;
  let status = 'ready';
  if (leader.coverage < 0.7) status = 'needs-evidence';
  else if (margin < 0.5) status = 'close-call';

  return {
    ranked,
    margin,
    status,
    recommendation: status === 'ready' ? leader : null,
  };
}

export function formatReport({ title, criteria, result, sample = false }) {
  const statusText = {
    ready: `当前建议：${result.recommendation.name}。领先 ${result.margin.toFixed(1)} 分；请仍以真实验证为准。`,
    'needs-evidence': '暂不建议：领先方案的证据覆盖率低于 70%，先补齐关键依据。',
    'close-call': '暂不建议：前两名差距小于 0.5 分，先验证最能改变结论的假设。',
  }[result.status];
  const lines = [
    `# ${String(title).replaceAll('\n', ' ')}`,
    '',
    sample ? '> 本报告来自示例数据，用于演示方法，不代表真实调研或个人项目成果。' : '> 请复核输入数据与证据来源。',
    '',
    '## 当前判断',
    '',
    statusText,
    '',
    '## 判断维度',
    '',
    ...criteria.map((item) => `- ${item.label || item.id}：权重 ${item.weight}/5`),
    '',
    '## 方案与证据',
  ];

  for (const option of result.ranked) {
    lines.push('', `### ${option.name} — ${option.score.toFixed(1)}/5`, '', `证据覆盖率：${Math.round(option.coverage * 100)}%`, '');
    for (const criterion of criteria) {
      const entry = option.scores[criterion.id];
      lines.push(`- ${criterion.label || criterion.id} ${entry.value}/5：${entry.evidence.trim() || '尚无依据'}`);
    }
  }

  lines.push('', '## 复核提醒', '', '- 分数只帮助比较，不能替代访谈、测试与实测结果。', '- 若权重或证据变化，请重新计算并记录原因。', '');
  return lines.join('\n');
}
