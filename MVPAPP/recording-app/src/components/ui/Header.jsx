import React from 'react';
import Logo from '../../Assets/Logo.png';

const Header = ({ className = '' }) => {
  return (
    <header className={`app-header ${className}`}>
      <div className="logo-container">
        <img 
          src={Logo} 
          alt="Love Retold" 
          className="app-logo"
        />
      </div>
    </header>
  );
};

export default Header;