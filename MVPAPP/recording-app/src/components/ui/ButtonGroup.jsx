import React from 'react';

const ButtonGroup = ({ 
  children, 
  orientation = 'horizontal',
  spacing = 'default',
  align = 'center',
  className = '' 
}) => {
  const orientationClass = {
    horizontal: 'flex flex-row',
    vertical: 'flex flex-col'
  }[orientation];

  const spacingClass = {
    none: '',
    sm: 'gap-sm',
    default: 'gap-lg',
    lg: 'gap-xl'
  }[spacing];

  const alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  }[align];

  return (
    <div className={`button-group ${orientationClass} ${spacingClass} ${alignClass} ${className}`}>
      {children}
    </div>
  );
};

export default ButtonGroup;