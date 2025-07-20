import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { executeQuery } from "@/lib/db"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const exerciseName = formData.get("name") as string
    const targetMuscle = formData.get("targetMuscle") as string
    const bodyPart = formData.get("bodyPart") as string
    const equipment = formData.get("equipment") as string
    const instructions = formData.get("instructions") as string

    if (!file || !exerciseName) {
      return NextResponse.json({ error: "File and exercise name are required" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`exercises/${exerciseName.toLowerCase().replace(/\s+/g, "-")}.gif`, file, {
      access: "public",
      contentType: file.type,
    })

    console.log(`File uploaded to ${blob.url}`)

    // Save to database
    await executeQuery(
      `
      INSERT INTO exercise_library 
        (name, gif_url, target_muscle, body_part, equipment, instructions) 
      VALUES 
        ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (name) 
      DO UPDATE SET 
        gif_url = $2,
        target_muscle = $3,
        body_part = $4,
        equipment = $5,
        instructions = $6,
        updated_at = CURRENT_TIMESTAMP
      `,
      [exerciseName, blob.url, targetMuscle, bodyPart, equipment, instructions],
    )

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: `Exercise "${exerciseName}" saved successfully`,
    })
  } catch (error) {
    console.error("Error uploading exercise:", error)
    return NextResponse.json({ error: "Failed to upload exercise" }, { status: 500 })
  }
}
