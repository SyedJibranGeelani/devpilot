import styles from './CodeBlock.module.css';

interface Props {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: Props) {
  function copyToClipboard() {
    navigator.clipboard.writeText(code).catch(() => {/* silent */});
  }

  return (
    <div className={styles.root}>
      {language && <span className={styles.lang}>{language}</span>}
      <button className={styles.copy} onClick={copyToClipboard} title="Copy code">
        📋 Copy
      </button>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
