import type { Metadata } from 'next';
export const metadata: Metadata = {title: 'Divercity 캠퍼스 커뮤니티', description: '함께 만나는 캠퍼스: 지도, 모임, 게시판과 채팅'};
export default function Layout({children}: {children: React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>;}
