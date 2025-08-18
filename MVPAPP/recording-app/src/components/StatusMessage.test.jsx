/**
 * Comprehensive Test Suite for Enhanced StatusMessage Component
 * Tests category-based styling, accessibility, and contextual actions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusMessage, { getStatusCategoryFromMessage } from './StatusMessage.jsx';

// Mock window functions
const mockReload = jest.fn();
const mockOpen = jest.fn();

Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true
});

describe('StatusMessage Component', () => {
  beforeEach(() => {
    mockReload.mockClear();
    mockOpen.mockClear();
  });

  describe('Basic Rendering', () => {
    test('renders with enhanced status object integration', () => {
      render(
        <StatusMessage 
          status="active" 
          title="Test Title" 
        />
      );
      
      expect(screen.getByTestId('status-message')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Ready to record your memory')).toBeInTheDocument();
    });

    test('uses custom message when provided', () => {
      const customMessage = 'Custom status message';
      render(
        <StatusMessage 
          status="error" 
          message={customMessage}
        />
      );
      
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    test('falls back to enhanced status message', () => {
      render(<StatusMessage status="expired" />);
      
      expect(screen.getByText('This recording link has expired (links are valid for 7 days)')).toBeInTheDocument();
    });
  });

  describe('Category-Based Styling and Icons', () => {
    const testCases = [
      { status: 'active', expectedCategory: 'ready', expectedClass: 'status-ready', expectedIcon: '🎤' },
      { status: 'pending', expectedCategory: 'ready', expectedClass: 'status-ready', expectedIcon: '🎤' },
      { status: 'completed', expectedCategory: 'completed', expectedClass: 'status-success', expectedIcon: '✅' },
      { status: 'processing', expectedCategory: 'progress', expectedClass: 'status-progress', expectedIcon: '⚙️' },
      { status: 'recording', expectedCategory: 'progress', expectedClass: 'status-progress', expectedIcon: '🔴' },
      { status: 'uploading', expectedCategory: 'progress', expectedClass: 'status-progress', expectedIcon: '☁️' },
      { status: 'expired', expectedCategory: 'error', expectedClass: 'status-error', expectedIcon: '⏰' },
      { status: 'removed', expectedCategory: 'error', expectedClass: 'status-error', expectedIcon: '🗑️' },
      { status: 'failed', expectedCategory: 'error', expectedClass: 'status-error', expectedIcon: '⚠️' },
      { status: 'invalid', expectedCategory: 'error', expectedClass: 'status-error', expectedIcon: '🚫' },
      { status: 'error', expectedCategory: 'error', expectedClass: 'status-error', expectedIcon: '❌' },
      { status: 'unknown', expectedCategory: 'unknown', expectedClass: 'status-unknown', expectedIcon: '❓' }
    ];

    testCases.forEach(({ status, expectedCategory, expectedClass, expectedIcon }) => {
      test(`applies correct styling and icon for ${status} status`, () => {
        render(<StatusMessage status={status} />);
        
        const messageElement = screen.getByTestId('status-message');
        expect(messageElement).toHaveClass(expectedClass);
        expect(messageElement).toHaveAttribute('data-status', status);
        expect(messageElement).toHaveAttribute('data-category', expectedCategory);
        
        // Check icon is present (text content)
        const iconElement = messageElement.querySelector('.status-icon');
        expect(iconElement).toHaveTextContent(expectedIcon);
      });
    });
  });

  describe('Accessibility Features', () => {
    test('includes proper ARIA attributes', () => {
      render(
        <StatusMessage 
          status="error" 
          title="Error Title" 
          message="Error message" 
        />
      );
      
      const messageElement = screen.getByTestId('status-message');
      expect(messageElement).toHaveAttribute('role', 'alert');
      expect(messageElement).toHaveAttribute('aria-live', 'polite');
      
      const iconElement = messageElement.querySelector('.status-icon');
      expect(iconElement).toHaveAttribute('aria-hidden', 'true');
      
      const titleElement = screen.getByText('Error Title');
      expect(titleElement).toHaveAttribute('id', 'status-title');
      
      const textElement = screen.getByTestId('status-text');
      expect(textElement).toHaveAttribute('aria-labelledby', 'status-title');
    });

    test('handles missing title accessibility', () => {
      render(<StatusMessage status="error" message="Just a message" />);
      
      const textElement = screen.getByTestId('status-text');
      expect(textElement).not.toHaveAttribute('aria-labelledby');
    });

    test('action buttons have proper accessibility', () => {
      render(<StatusMessage status="failed" />);
      
      const actionsGroup = screen.getByRole('group');
      expect(actionsGroup).toHaveAttribute('aria-label', 'Available actions');
      
      const button = screen.getByRole('button', { name: 'Retry loading session' });
      expect(button).toHaveAttribute('aria-label', 'Retry loading session');
    });
  });

  describe('Default Action Buttons', () => {
    test('shows Contact Support button for expired status', async () => {
      render(<StatusMessage status="expired" />);
      
      const button = screen.getByText('Contact Support');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Contact support for expired link');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          'mailto:support@loveretold.com?subject=Expired Recording Link',
          '_blank'
        );
      });
    });

    test('shows Try Again button for failed status', () => {
      render(<StatusMessage status="failed" />);
      
      const button = screen.getByText('Try Again');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Retry loading session');
      
      fireEvent.click(button);
      expect(mockReload).toHaveBeenCalled();
    });

    test('shows Try Again button for error status', () => {
      render(<StatusMessage status="error" />);
      
      const button = screen.getByText('Try Again');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(mockReload).toHaveBeenCalled();
    });

    test('shows Try Again button for unknown status', () => {
      render(<StatusMessage status="unknown" />);
      
      const button = screen.getByText('Try Again');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(mockReload).toHaveBeenCalled();
    });

    test('shows Refresh Status button for progress status', () => {
      render(<StatusMessage status="processing" />);
      
      const button = screen.getByText('Refresh Status');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Refresh to check status');
      
      fireEvent.click(button);
      expect(mockReload).toHaveBeenCalled();
    });

    test('shows no action button for completed status', () => {
      render(<StatusMessage status="completed" />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('shows no action button for ready status', () => {
      render(<StatusMessage status="active" />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('respects custom action button over default', () => {
      const customButton = <button>Custom Action</button>;
      render(<StatusMessage status="error" actionButton={customButton} />);
      
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    test('can disable default actions', () => {
      render(<StatusMessage status="error" showDefaultActions={false} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('respects null actionButton (explicit no button)', () => {
      render(<StatusMessage status="error" actionButton={null} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles null status gracefully', () => {
      render(<StatusMessage status={null} />);
      
      const messageElement = screen.getByTestId('status-message');
      expect(messageElement).toHaveClass('status-unknown');
      expect(messageElement).toHaveAttribute('data-status', 'unknown');
      expect(messageElement).toHaveAttribute('data-category', 'unknown');
    });

    test('handles undefined status gracefully', () => {
      render(<StatusMessage status={undefined} />);
      
      const messageElement = screen.getByTestId('status-message');
      expect(messageElement).toHaveClass('status-unknown');
    });

    test('handles unexpected status values', () => {
      render(<StatusMessage status="totally_unexpected_status" />);
      
      const messageElement = screen.getByTestId('status-message');
      expect(messageElement).toHaveClass('status-unknown');
      expect(screen.getByText(/Unexpected session state/)).toBeInTheDocument();
    });

    test('handles custom message with server error status', () => {
      const serverMessage = 'Server-specific error message';
      render(<StatusMessage status="error" customMessage={serverMessage} />);
      
      expect(screen.getByText(serverMessage)).toBeInTheDocument();
    });

    test('handles empty custom message gracefully', () => {
      render(<StatusMessage status="error" customMessage="" />);
      
      expect(screen.getByText('Unable to load recording session')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('integrates properly with enhanced session status', () => {
      render(<StatusMessage status="recording" title="In Progress" />);
      
      const messageElement = screen.getByTestId('status-message');
      expect(messageElement).toHaveAttribute('data-category', 'progress');
      expect(screen.getByText('Recording is currently in progress')).toBeInTheDocument();
      expect(screen.getByText('Refresh Status')).toBeInTheDocument();
    });

    test('maintains backward compatibility with legacy usage', () => {
      render(
        <StatusMessage 
          status="completed"
          message="Legacy message override"
          actionButton={<button>Legacy Action</button>}
        />
      );
      
      expect(screen.getByText('Legacy message override')).toBeInTheDocument();
      expect(screen.getByText('Legacy Action')).toBeInTheDocument();
    });
  });

  describe('Helper Function Tests', () => {
    test('getStatusCategoryFromMessage returns correct categories', () => {
      const testCases = [
        { status: 'active', expected: 'ready' },
        { status: 'completed', expected: 'completed' },
        { status: 'processing', expected: 'progress' },
        { status: 'error', expected: 'error' },
        { status: 'unknown', expected: 'unknown' },
        { status: null, expected: 'unknown' }
      ];

      testCases.forEach(({ status, expected }) => {
        expect(getStatusCategoryFromMessage(status)).toBe(expected);
      });
    });
  });
});

describe('StatusMessage Performance', () => {
  test('renders quickly with various statuses', () => {
    const statuses = ['active', 'pending', 'completed', 'processing', 'recording', 'uploading', 'expired', 'removed', 'failed', 'invalid', 'error', 'unknown'];
    
    const startTime = performance.now();
    
    statuses.forEach(status => {
      const { unmount } = render(<StatusMessage status={status} />);
      unmount();
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should render all status types in under 100ms
    expect(duration).toBeLessThan(100);
  });

  test('handles rapid re-renders efficiently', () => {
    const { rerender } = render(<StatusMessage status="active" />);
    
    const startTime = performance.now();
    
    // Perform 100 re-renders with different statuses
    for (let i = 0; i < 100; i++) {
      const status = ['active', 'pending', 'completed', 'error'][i % 4];
      rerender(<StatusMessage status={status} />);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should handle 100 re-renders in under 200ms
    expect(duration).toBeLessThan(200);
  });
});