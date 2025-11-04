type TextAreaProps = {
  row?: number;
  title: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  value: string;
  id?: string;
};

export default function TextArea({ row = 3, title, onChange, value, id }: TextAreaProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1 text-sm font-medium">
        {title}
      </label>
      <textarea
        id={id}
        rows={row}
        value={value}
        onChange={onChange}
        placeholder="Describe the initiative partnership..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                    focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
      />
    </div>
  );
}
