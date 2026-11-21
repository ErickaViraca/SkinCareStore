"use client";

import SearchOutlined from "@mui/icons-material/SearchOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}

/** Buscador con lupa (docs/UI.md, lista de productos). */
export function SearchField({ value, onChange, placeholder }: SearchFieldProps): React.JSX.Element {
  return (
    <TextField
      type="search"
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      sx={{ flex: 1, minWidth: 200, bgcolor: "background.paper", borderRadius: 3 }}
      slotProps={{
        htmlInput: { "aria-label": placeholder },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
