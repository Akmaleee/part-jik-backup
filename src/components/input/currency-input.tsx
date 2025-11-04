import { NumericFormat, NumericFormatProps } from "react-number-format";

export interface CurrencyInputProps extends Omit<NumericFormatProps, "onValueChange">{
	label?: string;
	value?: number | null;
	onValueChange?: (value: number) => void;
	id?: string;
}

export default function CurrencyInput({
	label,
	value,
	onValueChange,
	id = "investment-value",
	className,
	...rest
}: CurrencyInputProps){
	return(
		<div className="flex flex-col">
			<label htmlFor={id} className="mb-1 text-sm font-medium text-gray-700">{label}</label>
			<NumericFormat
				id={id}
				value={value ?? ""}
				thousandSeparator=","
				placeholder="Rp x"
				prefix="Rp"
				allowNegative={false}
				inputMode="numeric"
				className={`rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-non focus:ring focus:ring-blue-200 ${className??""}`}
				onValueChange={(v)=>{
					const num = v.floatValue??0;
					onValueChange?.(num);
				}}
				{...rest}
			/>
		</div>
		)
}