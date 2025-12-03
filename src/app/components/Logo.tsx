import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
    showSlogan?: boolean;
    size?: number;
    textClassName?: string;
}

export default function Logo({
    className = "",
    showText = false,
    showSlogan = false,
    size = 40,
    textClassName = "text-brand-navy"
}: LogoProps) {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="flex items-center gap-3">
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 100 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                >
                    {/* Lock Shackle (Gold) */}
                    <path
                        d="M30 35V25C30 13.9543 38.9543 5 50 5C61.0457 5 70 13.9543 70 25V35"
                        stroke="#D4AF37"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />

                    {/* Shield Body (Navy) */}
                    <path
                        d="M50 115C50 115 90 100 90 55V35H10V55C10 100 50 115 50 115Z"
                        fill="#0f3460"
                        stroke="#0f3460"
                        strokeWidth="4"
                    />

                    {/* "S" (Teal) */}
                    <path
                        d="M65 55C65 55 65 45 50 45C35 45 35 55 35 65C35 75 65 75 65 85C65 95 50 95 35 95"
                        stroke="#38b2ac"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* "V" (Gold - subtle overlay or behind? Let's make it simple "SV" monogram style or just S for Slips) 
                       Actually, the user image had S and V interlocking. 
                       Let's try to add a V shape behind or intertwined.
                       For simplicity and clarity at small sizes, I'll stick to a stylized S or SV.
                       Let's add a V shape in Gold.
                    */}
                    <path
                        d="M35 45L50 85L65 45"
                        stroke="#D4AF37"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                        fill="none"
                    />
                </svg>

                {showText && (
                    <div className="flex flex-col">
                        <span className={`font-bold leading-none ${textClassName}`} style={{ fontSize: size * 0.6 }}>
                            SlipsVault
                        </span>
                    </div>
                )}
            </div>

            {showSlogan && (
                <span className="text-[10px] tracking-[0.2em] text-gray-500 font-medium mt-2 uppercase text-center">
                    SECURE. ORGANIZED. ACCESSIBLE.
                </span>
            )}
        </div>
    );
}
