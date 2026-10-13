import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** 画面の骨組み：上に内容、下に主要ボタン（片手で押せる位置） */
export function Page({
  title,
  back = '/',
  right,
  children,
  bottom,
}: {
  title?: ReactNode;
  back?: string | null;
  right?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <div className="page">
      {(title || back) && (
        <header className="page-header">
          {back ? (
            <Link to={back} className="header-btn" aria-label="戻る">
              ‹
            </Link>
          ) : (
            <span className="header-btn" />
          )}
          <h1 className="page-title">{title}</h1>
          <span className="header-right">{right}</span>
        </header>
      )}
      <main className="page-body">{children}</main>
      {bottom && <footer className="bottom-bar">{bottom}</footer>}
    </div>
  );
}
