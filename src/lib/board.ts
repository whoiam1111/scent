// 사람이 텔레그램에서 복사해 고쳐 올린 누적 결과지(base)에 새 신청 줄을 이어 붙인다 (시다봇이 저장해 둔 글).
// base 에 이미 있는 사람(이름 기준, '#' 무시)은 고친 줄 그대로 두고, 없는 사람만 그 후속연결 칸 맨 뒤에 붙인다.
// shortcut: base 에서 일부러 지운 사람도 신청 기록이 있으면 다시 붙는다. 지우는 일이 잦으면 '지움' 표시를 둔다
export type Group = 'O' | '보류' | 'X';
const GROUPS: Group[] = ['O', '보류', 'X'];
export const groupTitle = (g: Group) => `▪️후속연결${g === 'O' ? 'O' : ` ${g}`}`;
export const nameOf = (line: string) => line.split('/')[0].replace(/^\s*#/, '').trim();

function groupOf(line: string): Group | null {
    if (!/^\s*▪/.test(line) || !/후속\s*연결/.test(line)) return null;
    const rest = line.split(/연결/)[1] ?? '';
    return /보류/.test(rest) ? '보류' : /[Xx✕×❌]/.test(rest) ? 'X' : 'O';
}

export function mergeBoard(base: string, gen: Record<Group, string[]>): string[] {
    const lines = base.replace(/\r/g, '').split('\n');
    const have = new Set(lines.filter((l) => l.includes('/')).map(nameOf));
    const add = (g: Group) => gen[g].filter((l) => !have.has(nameOf(l)));
    const out: string[] = [];
    const done = new Set<Group>();
    let cur: Group | null = null;
    const flush = () => {
        if (!cur || done.has(cur)) return;
        let i = out.length;
        while (i > 0 && !out[i - 1].trim()) i--; // 칸 사이 빈 줄 앞에 넣는다
        out.splice(i, 0, ...add(cur));
        done.add(cur);
    };
    for (const l of lines) {
        const g = groupOf(l);
        if (g) {
            flush();
            cur = g;
        }
        out.push(l);
    }
    flush();
    for (const g of GROUPS) if (!done.has(g) && add(g).length) out.push('', groupTitle(g), ...add(g)); // base 에 없던 칸
    return out;
}
