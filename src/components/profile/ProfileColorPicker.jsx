export default function ProfileColorPicker({ colors, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: color === value ? "#FFFFFF" : "rgba(255,255,255,0.45)",
            boxShadow: color === value ? "0 0 0 2px #1E4E8C" : "none",
          }}
          aria-label={`Choose profile color ${color}`}
        />
      ))}
    </div>
  );
}
