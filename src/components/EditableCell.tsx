import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  canEdit?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  textClassName?: string;
  type?: string;
  forceUppercase?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  canEdit = true,
  placeholder = '',
  className = '',
  inputClassName = '',
  textClassName = '',
  type = 'text',
  forceUppercase = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onSave(currentValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value || '');
    }
  };

  // Nouvelle fonction pour gérer les changements avec validation majuscules
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const finalValue = forceUppercase ? inputValue.toUpperCase() : inputValue;
    setCurrentValue(finalValue);
  };

  return (
    <div 
      className={`w-full h-full flex items-center justify-center cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-[90%] py-1 px-2 text-sm text-center border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${inputClassName}`}
          placeholder={placeholder}
          autoComplete="off"
        />
      ) : (
        <span className={`inline-block text-center ${textClassName}`}>
          {value || placeholder}
        </span>
      )}
    </div>
  );
};

export default EditableCell; 