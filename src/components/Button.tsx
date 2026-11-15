import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface CommonProps {
  variant?: Variant;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}
type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
type LinkProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string; disabled?: undefined };

/** Shared button. With `href` it renders an anchor (hash routes / external links), otherwise a button. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', icon, className, children, ...rest } = props;
  const classes = `btn btn--${variant}${className ? ` ${className}` : ''}`;
  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<LinkProps, keyof CommonProps>;
    return <a {...anchor} href={href} className={classes}>{children}{icon}</a>;
  }
  const { href: _unused, type = 'button', ...button } = rest as Omit<ButtonProps, keyof CommonProps>;
  return <button {...button} type={type} className={classes}>{children}{icon}</button>;
}
