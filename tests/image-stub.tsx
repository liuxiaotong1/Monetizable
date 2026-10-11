import React from 'react';
export default function Image({ sizes: _sizes, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) { return <img {...props}/>; }
