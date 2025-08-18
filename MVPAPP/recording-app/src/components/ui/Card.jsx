import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'default',
  shadow = 'default'
}) => {
  const paddingClass = {
    none: '',
    sm: 'p-lg',
    default: 'p-xl',
    lg: 'p-2xl'
  }[padding];

  const shadowClass = {
    none: '',
    sm: 'shadow-sm',
    default: 'shadow-card',
    lg: 'shadow-lg'
  }[shadow];

  return (
    <div className={`card ${paddingClass} ${shadowClass} ${className}`}>
      {children}
    </div>
  );
};

export default Card;