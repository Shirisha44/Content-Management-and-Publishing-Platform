from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0001_blog_metadata"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "blogs" not in inspector.get_table_names():
        op.create_table(
            "blogs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column("author_id", sa.String(length=255), nullable=True),
        )
        return

    columns = {column["name"] for column in inspector.get_columns("blogs")}
    if "created_at" not in columns:
        op.add_column("blogs", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
    if "updated_at" not in columns:
        op.add_column("blogs", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    if "author_id" not in columns:
        op.add_column("blogs", sa.Column("author_id", sa.String(length=255), nullable=True))

    op.execute(sa.text("UPDATE blogs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
    op.execute(sa.text("UPDATE blogs SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"))

    with op.batch_alter_table("blogs") as batch_op:
        batch_op.alter_column(
            "created_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        )
        batch_op.alter_column(
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "blogs" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("blogs")}
    with op.batch_alter_table("blogs") as batch_op:
        for column_name in ("author_id", "updated_at", "created_at"):
            if column_name in columns:
                batch_op.drop_column(column_name)
