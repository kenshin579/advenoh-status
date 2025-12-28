'use client';

import { useState, useEffect } from 'react';
import type { Service } from '@/types';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string; threshold_ms: number }) => Promise<void>;
  service: Service | null;
  error: string | null;
}

export default function ServiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  service,
  error,
}: ServiceFormModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [thresholdMs, setThresholdMs] = useState(3000);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEdit = !!service;

  useEffect(() => {
    if (service) {
      setName(service.name);
      setUrl(service.url);
      setThresholdMs(service.threshold_ms);
    } else {
      setName('');
      setUrl('');
      setThresholdMs(3000);
    }
    setValidationError(null);
  }, [service, isOpen]);

  if (!isOpen) return null;

  const validateUrl = (value: string): boolean => {
    try {
      const urlObj = new URL(value);
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please enter a service name.');
      return;
    }

    if (!validateUrl(url)) {
      setValidationError('Please enter a valid URL format. (https:// or http://)');
      return;
    }

    if (thresholdMs < 0) {
      setValidationError('Threshold must be 0 or greater.');
      return;
    }

    setSubmitting(true);
    await onSubmit({ name: name.trim(), url: url.trim(), threshold_ms: thresholdMs });
    setSubmitting(false);
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setThresholdMs(3000);
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEdit ? 'Edit Service' : 'Add Service'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              placeholder="e.g., My Service"
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
              Threshold (ms)
            </label>
            <input
              id="threshold"
              type="number"
              value={thresholdMs}
              onChange={(e) => setThresholdMs(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
              min={0}
            />
          </div>

          {(validationError || error) && (
            <p className="text-sm text-red-600">{validationError || error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
