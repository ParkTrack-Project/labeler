import { ComponentProps, useRef, useState } from 'react';
import { clsx } from 'clsx';

export function Button(props: ComponentProps<'button'> & {variant?: 'primary'|'ghost'|'danger'}) {
  const { className, variant='primary', ...rest } = props;
  return <button className={clsx('button', variant, className)} {...rest} />;
}
export function Input(props: ComponentProps<'input'>) {
  const { className, ...rest } = props;
  return <input className={clsx('input', className)} {...rest} />;
}
export function Select(props: ComponentProps<'select'>) {
  const { className, ...rest } = props;
  return <select className={clsx('select', className)} {...rest} />;
}
export function Textarea(props: ComponentProps<'textarea'>) {
  const { className, ...rest } = props;
  return <textarea className={clsx('input', className)} {...rest} />;
}
export function Field({label, children, hint}:{label:string; children:React.ReactNode; hint?:string}) {
  return (
    <div className="col">
      <div className="small">{label}</div>
      {children}
    </div>
  );
}

/** Кастомный файл-пикер: кнопка + подпись с именем файла, выровнены по центру */
export function FilePicker({
  accept = 'image/*',
  onPick
}: {
  accept?: string;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>('Файл не выбран');

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setName(f.name);
    onPick(f);
  }

  return (
    <div className="filepicker">
      <label className="button" style={{cursor:'pointer'}}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onChange}
          className="file-input-hidden"
        />
        Выбрать файл
      </label>
      <span className="small">{name}</span>
    </div>
  );
}
