import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  kicker?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}

export function Card({ title, kicker, headingLevel = 3, className, children }: CardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {kicker && <span className="card__kicker mono">{kicker}</span>}
      {title && <Heading className="card__title">{title}</Heading>}
      {children}
    </section>
  );
}
