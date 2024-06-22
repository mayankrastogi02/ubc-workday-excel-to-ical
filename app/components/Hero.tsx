import React from 'react'
import FileUpload from './FileUpload'

function Hero() {
    return (
        <div className="hero min-h-screen bg-base-200">
            <div className="hero-content text-center">
                <div className="max-w-md">
                    <h1 className="text-5xl font-bold my-12">UBC Workday Excel to iCal</h1>
                    <FileUpload />
                </div>
            </div>
        </div>
    )
}

export default Hero