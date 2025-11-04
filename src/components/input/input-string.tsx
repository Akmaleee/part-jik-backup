type InputProps = {
	title: string;
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	value?: string | number;
	id?: string;
	placeholder?: string;
	required?: boolean;
	type?: string;
}

export default function InputString({
	title,
	onChange,
	value,
	id,
	placeholder,
	required = false,
	type = "text",
}:InputProps){
	return (
		<div>
			<label 
				htmlFor={id}
				className="mb-1 text-sm font-medium"
			>
				{title}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<input
				type={type}
				id={id}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				required={required}
				className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
				focus:border-blue-500 focus:outline-none focus:ring focus:ring-blue-200"
			/>
		</div>
		)
}