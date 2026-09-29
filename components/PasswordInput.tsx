'use client';

import { useState } from 'react';

type Props = {
  name: string;
  label: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  placeholder?: string;
};

export default function PasswordInput({
  name,
  label,
  autoComplete,
  minLength = 6,
  required = true,
  placeholder,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {label}
      <span style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          style={{flex:1,marginTop:0}}
        />
        <button
          type="button"
          className="secondaryButton"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? '隱藏密碼' : '顯示密碼'}
          style={{whiteSpace:'nowrap'}}
        >
          {visible ? '隱藏' : '顯示'}
        </button>
      </span>
    </label>
  );
}
