import React from 'react';

const Button = ({ 
  children, 
  onClick,
  variant = 'primary',
  size = 'default',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'btn transition-normal focus-outline';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary', 
    outline: 'btn-outline',
    ghost: 'btn-ghost'
  }[variant];

  const sizeClasses = {
    sm: 'btn-sm',
    default: '',
    lg: 'btn-lg'
  }[size];

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;