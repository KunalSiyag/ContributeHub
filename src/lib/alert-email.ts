/*
 * The daily alert digest email: one message per member, one section per
 * alert with new issues. Plain text and simple HTML, every value escaped.
 */

export interface DigestIssue {
  title: string;
  repository: string;
  number: number;
  url: string;
}

export interface DigestSection {
  name: string;
  /** Matching issues since the last email (the list may show fewer). */
  total: number;
  issues: DigestIssue[];
  /** Stops emails for this alert only. */
  unsubscribeUrl: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const issues = (n: number) => `${n.toLocaleString('en-US')} new ${n === 1 ? 'issue' : 'issues'}`;

export function digestEmail({ site, sections }: { site: string; sections: DigestSection[] }) {
  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const subject = sections.length === 1 ? `${issues(total)} for “${sections[0].name}”` : `${issues(total)} across your Orion alerts`;

  const text = [
    ...sections.map(section =>
      [
        `${section.name}: ${issues(section.total)}`,
        ...section.issues.map(issue => `- ${issue.repository}#${issue.number} ${issue.title}\n  ${issue.url}`),
        ...(section.total > section.issues.length ? [`  …and ${section.total - section.issues.length} more on ${site}/alerts`] : []),
        `Stop emails for this alert: ${section.unsubscribeUrl}`,
      ].join('\n')
    ),
    `Manage your alerts: ${site}/alerts`,
  ].join('\n\n');

  const sectionHtml = sections
    .map(
      section => `<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717">${escapeHtml(section.name)} <span style="font-weight:400;color:#5e5e5e">· ${escapeHtml(issues(section.total))}</span></h2>
<ul style="margin:0;padding:0;list-style:none">
${section.issues
  .map(
    issue => `<li style="margin:0 0 8px"><a href="${escapeHtml(issue.url)}" style="color:#171717">${escapeHtml(issue.title)}</a><br><span style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#5e5e5e">${escapeHtml(`${issue.repository}#${issue.number}`)}</span></li>`
  )
  .join('\n')}
</ul>
${section.total > section.issues.length ? `<p style="margin:4px 0;font-size:13px;color:#5e5e5e">…and ${section.total - section.issues.length} more on <a href="${escapeHtml(`${site}/alerts`)}" style="color:#5e5e5e">Orion</a>.</p>` : ''}
<p style="margin:4px 0;font-size:12px"><a href="${escapeHtml(section.unsubscribeUrl)}" style="color:#737373">Stop emails for this alert</a></p>`
    )
    .join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#171717">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 4px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.07em;text-transform:uppercase;color:#5e5e5e">Orion alerts</p>
${sectionHtml}
<p style="margin:24px 0 0;font-size:12px;color:#737373">You get this because you turned on email for these alerts. <a href="${escapeHtml(`${site}/alerts`)}" style="color:#737373">Manage alerts</a></p>
</div>
</body></html>`;

  return { subject, text, html };
}
