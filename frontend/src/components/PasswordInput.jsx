import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-input-wrap">
      <input {...inputProps} type={visible ? "text" : "password"} />
      <button
        className="password-visibility-toggle"
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}
