import { renderAssistantText } from './assistant-panel.component';

describe('renderAssistantText', () => {
  it('turns **bold** and line breaks into markup', () => {
    expect(renderAssistantText('Stock : **12 sacs**\nÀ commander')).toBe('Stock : <strong>12 sacs</strong><br>À commander');
  });

  it('escapes HTML so answers cannot inject markup', () => {
    const out = renderAssistantText('<img src=x onerror="alert(1)"> **ok**');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(out).toContain('<strong>ok</strong>');
  });
});
