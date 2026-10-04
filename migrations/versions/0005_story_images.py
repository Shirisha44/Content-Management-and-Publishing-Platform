from alembic import op
import sqlalchemy as sa

revision = "0005_story_images"
down_revision = "0004_password_recovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("blogs", sa.Column("cover_image_url", sa.String(length=500), nullable=True))
    op.add_column("blogs", sa.Column("cover_image_alt", sa.String(length=250), nullable=True))


def downgrade() -> None:
    op.drop_column("blogs", "cover_image_alt")
    op.drop_column("blogs", "cover_image_url")
