/**
 * The JudicialGPT logo (public/logo.svg).
 *
 * `auto` follows the site theme: dark green on light, white on dark.
 * `dark` / `light` force one version, for surfaces whose colour never changes
 * (e.g. the always-dark admin sidebar).
 */
interface BrandLogoProps {
    /** Sizing classes, e.g. "h-8 w-auto". */
    className?: string;
    variant?: 'auto' | 'dark' | 'light';
    alt?: string;
}

export default function BrandLogo({ className = 'h-8 w-auto', variant = 'auto', alt = 'JudicialGPT' }: BrandLogoProps) {
    if (variant === 'dark') {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src="/logo.svg" alt={alt} className={`${className} shrink-0`} />;
    }
    if (variant === 'light') {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src="/logo-light.svg" alt={alt} className={`${className} shrink-0`} />;
    }
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt={alt} className={`${className} shrink-0 dark:hidden`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.svg" alt={alt} className={`${className} shrink-0 hidden dark:block`} />
        </>
    );
}
