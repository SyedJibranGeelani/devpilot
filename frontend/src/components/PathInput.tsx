import styles from './PathInput.module.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export default function PathInput({ value, onChange, onSubmit, placeholder }: Props) {
  return (
    <input
      className={styles.input}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
      placeholder={placeholder ?? '/path/to/project'}
      spellCheck={false}
      autoComplete="off"
    />
  );
}
