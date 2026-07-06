import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export const Button = ({ variant = 'primary', children, ...props }: ButtonProps) => {
  const baseStyles = "px-6 py-3 rounded-lg font-medium transition-colors shadow-sm";
  const variants = {
    primary: "bg-[#1F3E2E] text-white hover:bg-[#152e21]",
    secondary: "bg-white text-[#1F3E2E] border-2 border-[#1F3E2E] hover:bg-gray-100"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
};
